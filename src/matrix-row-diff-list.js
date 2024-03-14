import { BdCheckbox, BdInput } from "@bionamic/body";
import { getRange } from "@bionamic/util";
import {
	BnMatrixRowDiffCard,
	getKeys,
	getMatrixValue,
} from "./matrix-row-diff-card.js";

/**
 * @typedef {import("./matrix-row-diff-card.js").IMatrixRowDiffCard} IMatrixRowDiffCard
 * @typedef {import("./matrix-row-diff-card.js").MatrixRowValues} MatrixRowValues
 * @typedef {import("./matrix-row-diff-card.js").HeaderContent} HeaderContent
 */

/**
 * @typedef {Object} MatrixRowDiffListCard
 * @property {(() => void)|null} navigate
 * @property {(() => void)|null} discardChanges
 * @property {() => string} getTitle
 * @property {() => MatrixRowValues|null} getMatrixRowValues1
 * @property {() => MatrixRowValues|null} getMatrixRowValues2
 *
 * @typedef {{ label1: string, label2: string }} ModalLabels
 */

/**
 * @typedef {Object} IMatrixRowDiffList
 * @property {() => MatrixRowDiffListCard[]} getCards
 * @property {() => number} getMaxNumOfRows
 * @property {() => ModalLabels} getModalLabels
 *
 */

const template = document.createElement("template");
const rowThreshold = 10;

template.innerHTML = `
	<link rel="stylesheet" href="./css/styles.css" media="screen" />
    <link rel="stylesheet" href="./css/icons.css" media="screen" />
    <div class="matrix-row-diff-list">
        <div class="card-filter">
            <bd-input
                placeholder="Search"
                showLabel
            ></bd-input>
            <bd-label>
                <bd-checkbox></bd-checkbox>
                <bd-text>Hide unchanged properties</bd-text>
            </bd-label>
        </div>
		<div class="message">
			<span class="icon info"></span>
			<span class="text"></span>
		</div>
		<div class="cards-container"></div>
    </div>`;

class BnMatrixRowDiffList extends HTMLElement {
	/** @type {MatrixRowDiffListCard[]} */
	#cards = [];
	/** @type {number} */
	#maxNumOfRows = 1000;
	/** @type {ModalLabels} */
	#labels = { label1: "", label2: "" };

	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: "open" });
		shadowRoot.appendChild(template.content.cloneNode(true));
		customElements.upgrade(this);
	}

	/**
	 * @param {IMatrixRowDiffList} ic
	 */
	set ic(ic) {
		const root = /** @type {HTMLDivElement} */ (
			this.shadowRoot?.querySelector(".matrix-row-diff-list")
		);
		this.#maxNumOfRows = ic.getMaxNumOfRows();
		this.#cards = ic.getCards();
		this.#labels = ic.getModalLabels();
		if (this.#cards.length === 0) {
			root.style.display = "none";
			return;
		}
		const input = /** @type {BdInput} */ (root.querySelector("bd-input"));
		const checkbox = /** @type {BdCheckbox} */ (
			root.querySelector("bd-checkbox")
		);
		input.addEventListener("input", () => this.#update());
		checkbox.addEventListener("click", () => this.#update());
		this.#update();
	}

	#update() {
		const root = /** @type {HTMLDivElement} */ (
			this.shadowRoot?.querySelector(".matrix-row-diff-list")
		);
		const input = /** @type {BdInput} */ (root.querySelector("bd-input"));
		const checkbox = /** @type {BdCheckbox} */ (
			root.querySelector("bd-checkbox")
		);
		const searchValue = input.value;
		const hideUnchangedProps = checkbox.checked;
		const cards = this.#cards;
		const labels = this.#labels;
		const maxNumOfRows = this.#maxNumOfRows;
		const indicesBySearch = getIndicesBySearch(searchValue, cards);
		const { cardsByRowLimit, indicesByRowLimit } = getCardsAndIndicesByRowLimit(
			cards,
			indicesBySearch,
			hideUnchangedProps,
			maxNumOfRows,
		);
		const cardsHeaders = getHeadersByIndex(indicesByRowLimit, cards);
		showMessage(cardsByRowLimit.length, indicesBySearch.length, root);
		ensureBnCards(cardsByRowLimit.length, root);
		showCards(cardsByRowLimit, cardsHeaders, labels, root);
	}
}

/**
 *
 * @param {string} value
 * @param {MatrixRowDiffListCard[]} cards
 * @returns {number[]}
 */
function getIndicesBySearch(value, cards) {
	if (value.trim() === "") {
		return getRange(0, cards.length);
	}
	const re = new RegExp(value.trim(), "i");
	/** @type {number[]} */
	const indices = [];
	/** @type {MatrixRowDiffListCard[]} */
	for (let i = 0; i < cards.length; i++) {
		const title = cards[i].getTitle();
		const row1 = cards[i].getMatrixRowValues1();
		const row2 = cards[i].getMatrixRowValues2();
		if (
			rowMatchesInput(row1, re) ||
			rowMatchesInput(row2, re) ||
			title.match(re)
		) {
			indices.push(i);
		}
	}
	return indices;
}

/**
 *
 * @param {MatrixRowDiffListCard[]} cards
 * @param {number[]} indices
 * @param {boolean} hideUnchangedProperties
 * @param {number} rowLimit
 * @returns {{cardsByRowLimit: MatrixRowDiffListCard[], indicesByRowLimit: number[]}}
 */
function getCardsAndIndicesByRowLimit(
	cards,
	indices,
	hideUnchangedProperties,
	rowLimit,
) {
	/** @type {MatrixRowDiffListCard[]} */
	const cardsByRowLimit = [];
	/** @type {number[]} */
	const indicesByRowLimit = [];
	let remaniningRows = rowLimit;
	for (const i of indices) {
		if (remaniningRows <= rowThreshold) {
			break;
		}
		const matrixRow1 = cards[i].getMatrixRowValues1();
		const matrixRow2 = cards[i].getMatrixRowValues2();
		if (matrixRow1 === null && matrixRow2 === null) {
			continue;
		}
		if (
			!hideUnchangedProperties ||
			matrixRow1 === null ||
			matrixRow2 === null
		) {
			const cardKeysLength = getKeys(matrixRow1, matrixRow2).length;
			if (remaniningRows < cardKeysLength) {
				continue;
			}
			cardsByRowLimit.push(cards[i]);
			indicesByRowLimit.push(i);
			remaniningRows -= cardKeysLength;
		} else {
			const { filteredRow1, filteredRow2 } = getRowsByUnchagedProperties(
				matrixRow1,
				matrixRow2,
			);
			const cardKeysLength = getKeys(filteredRow1, filteredRow2).length;
			if (
				remaniningRows < cardKeysLength ||
				(filteredRow1.length === 0 && filteredRow2.length === 0)
			) {
				continue;
			}
			const navigate = cards[i].navigate;
			const discardChanges = cards[i].discardChanges;
			/** @type {MatrixRowDiffListCard} */
			const newCard = {
				navigate,
				discardChanges,
				getTitle: () => cards[i].getTitle(),
				getMatrixRowValues1: () => filteredRow1,
				getMatrixRowValues2: () => filteredRow2,
			};
			cardsByRowLimit.push(newCard);
			indicesByRowLimit.push(i);
			remaniningRows -= cardKeysLength;
		}
	}
	return { cardsByRowLimit, indicesByRowLimit };
}

/**
 * @param {MatrixRowValues} matrixRow1
 * @param {MatrixRowValues} matrixRow2
 * @returns {{ filteredRow1: MatrixRowValues, filteredRow2: MatrixRowValues }}
 */
function getRowsByUnchagedProperties(matrixRow1, matrixRow2) {
	/** @type {[string, string][]} */
	const filteredRow1 = [];
	/** @type {[string, string][]} */
	const filteredRow2 = [];
	const keys = getKeys(matrixRow1, matrixRow2);
	for (const key of keys) {
		const v1 = getMatrixValue(matrixRow1, key);
		const v2 = getMatrixValue(matrixRow2, key);
		if (v1 !== v2) {
			filteredRow1.push([key, v1]);
			filteredRow2.push([key, v2]);
		}
	}
	return { filteredRow1, filteredRow2 };
}

/**
 *
 * @param {number[]} indices
 * @param {MatrixRowDiffListCard[]} cards
 * @returns {{header1: HeaderContent, header2: HeaderContent}[]}
 */
function getHeadersByIndex(indices, cards) {
	/** @type {{header1: HeaderContent, header2: HeaderContent}[]} */
	const headers = [];
	for (const i of indices) {
		const matrixRow1 = cards[i].getMatrixRowValues1();
		const matrixRow2 = cards[i].getMatrixRowValues2();
		const header1 = getHeaderFromMatrixRow(matrixRow1);
		const header2 = getHeaderFromMatrixRow(matrixRow2);
		const headerPair = {
			header1,
			header2,
		};
		headers.push(headerPair);
	}
	return headers;
}

/**
 * @param {number} count
 * @param {HTMLDivElement} root
 */
function ensureBnCards(count, root) {
	const container = /** @type {HTMLDivElement} */ (
		root.querySelector(".cards-container")
	);
	const children = container.children;
	const len = children.length;
	const bn = new BnMatrixRowDiffCard();
	for (let i = len; i < count; i++) {
		container.appendChild(bn.cloneNode(true));
	}
	for (let i = len; i > count; i--) {
		const child = children[i - 1];
		child.remove();
	}
}

/**
 *
 * @param {MatrixRowDiffListCard[]} cards
 * @param {{header1: HeaderContent, header2: HeaderContent}[]} headers
 * @param {ModalLabels} labels
 * @param {HTMLDivElement} root
 */
function showCards(cards, headers, labels, root) {
	const container = /** @type {HTMLDivElement} */ (
		root.querySelector(".cards-container")
	);
	const bnCards = container.children;
	for (let i = 0; i < cards.length; i++) {
		const card = cards[i];
		const navigate = card.navigate;
		const discardChanges = card.discardChanges;
		const title = card.getTitle();
		const header1 = headers[i].header1;
		const header2 = headers[i].header2;
		const matrixRowValues1 = card.getMatrixRowValues1();
		const matrixRowValues2 = card.getMatrixRowValues2();
		const { label1, label2 } = labels;
		/** @type {IMatrixRowDiffCard} */
		const ic = {
			navigate: navigate,
			discardChanges: discardChanges,
			getTitle: () => title,
			getHeader1: () => header1,
			getHeader2: () => header2,
			getMatrixRowValues1: () => matrixRowValues1,
			getMatrixRowValues2: () => matrixRowValues2,
			getModalLabel1: () => label1,
			getModalLabel2: () => label2,
		};
		const bnCard = /** @type {BnMatrixRowDiffCard} */ (bnCards[i]);
		bnCard.ic = ic;
	}
}

/**
 * @param {number} cardsShown
 * @param {number} totalCards
 * @param {HTMLDivElement} root
 */
function showMessage(cardsShown, totalCards, root) {
	const msgSpan = /** @type {HTMLSpanElement} */ (
		root.querySelector("div.message .text")
	);
	const msgIcon = /** @type {HTMLSpanElement} */ (
		root.querySelector("div.message .icon")
	);
	const s = totalCards !== 1 ? "s" : "";
	const infoMsg = `${totalCards} card${s}.`;
	const warningMsg =
		cardsShown < totalCards ? " Not all of them are shown." : "";
	const msg = infoMsg.concat(warningMsg);
	msgSpan.innerText = msg;
	const showWarningIcon = cardsShown < totalCards;
	msgIcon.classList.toggle("info", !showWarningIcon);
	msgIcon.classList.toggle("warningFilled", showWarningIcon);
}

/**
 *
 * @param {MatrixRowValues | null} row
 * @param {RegExp} re
 * @returns {boolean}
 */
function rowMatchesInput(row, re) {
	if (row == null) {
		return false;
	}
	for (const [k, v] of row) {
		let ind = 0;
		for (let i = k.length - 1; i > 0; i--) {
			if (k[i] === "/") {
				ind = i;
			}
		}
		const key = k.slice(ind);
		if (key.match(re) || v.match(re)) {
			return true;
		}
	}
	return false;
}

/**
 * @param {MatrixRowValues|null} row
 * @returns {HeaderContent}
 */
function getHeaderFromMatrixRow(row) {
	const rowName = row !== null ? getMatrixValue(row, "/general/row-name") : "";
	const userLastChange =
		row !== null ? getMatrixValue(row, "/general/user-last-change") : "";
	const timeCreation =
		row !== null ? getMatrixValue(row, "/general/time-creation") : "";
	return { name: rowName, user: userLastChange, time: timeCreation };
}

customElements.define("bn-matrix-row-diff-list", BnMatrixRowDiffList);

export { BnMatrixRowDiffList, getHeaderFromMatrixRow };
