import { BdIconButton } from "@bionamic/body";
import { BnModalDiffCardValues } from "./modal-diff-card-values.js";

/**
 *
 * @typedef {[string, string][]} MatrixRowValues
 * @typedef { {"name": string, "user": string, "time": string } } HeaderContent
 * @typedef {{key1: string, key2: string, value1: string, value2: string}} TableRowContent
 *
 * @typedef {object} IMatrixRowDiffCard
 * @property {(() => void)|null} navigate
 * @property {(() => void)|null} discardChanges
 * @property {() => string} getTitle
 * @property {() => HeaderContent|null} getHeader1
 * @property {() => HeaderContent|null} getHeader2
 * @property {() => MatrixRowValues|null} getMatrixRowValues1
 * @property {() => MatrixRowValues|null} getMatrixRowValues2
 * @property {() => string} getModalLabel1
 * @property {() => string} getModalLabel2
 *
 * @typedef {import("./modal-diff-card-values.js").IModalDiffCardValues} IModalDiffCardValues
 *
 */

const excludedKeys = [
	"/general/",
	"/item/property/",
	"/item/duck/container/",
	"/item/duck/dataset/",
	"/item/duck/molecule/",
	"/item/duck/free/",
	"/item/",
	"/spec/property-rule/",
	"/spec/",
];

const tableTemplate = document.createElement("template");
tableTemplate.innerHTML = `
    <link rel="stylesheet" href="./css/styles.css" media="screen" />
    <link rel="stylesheet" href="./css/icons.css" media="screen" />
    <table class="matrix-row-diff-card">
		<thead>
			<tr class="title">
				<th scope="col" colspan="2">
					<div>
						<div class="left" style="visibility: hidden; width: 64px;"></div>
						<div class="center text">
							<span></span>
						</div>
						<div class="right buttons">
							<bd-icon-button class="open button"></bd-icon-button>
							<bd-icon-button class="reset button"></bd-icon-button>
						</div>
					</div>
				</th>
			</tr> 
			<tr class="sub-headers-row">
				<th scope="col" rowspan="1" class="sub-header1">
					<div>
						<span class="row-name"></span>
						<span class="icon user"></span>
						<span class="user-name"></span>
						<span class="time icon history"></span>
						<span class="time-date"></span>
					</div>
				</th>
				<th scope="col" rowspan="1" class="sub-header2">
					<div>
						<span class="row-name"></span>
						<span class="icon user"></span>
						<span class="user-name"></span>
						<span class="time icon history"></span>
						<span class="time-date"></span>
					</div>	
				</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
    </table>
`;

const trTemplate = document.createElement("template");
trTemplate.innerHTML = `
	<tr class="matrix-row-diff-card-row">
		<td class="half-1">
			<div>
				<span class="key"></span>
				<span class="value"></span>
			</div>
		</td>
		<td class="half-2">
			<div>
				<span class="key"></span>
				<span class="value"></span>
			</div>
		</td>
	</tr>
`;

class BnMatrixRowDiffCard extends HTMLElement {
	/** @type {(() => void)|null} */
	#navigate = null;
	/** @type {(() => void)|null} */
	#discardChanges = null;
	/** @type {TableRowContent[]} */
	#tableRowsContent = [];
	/** @type {string} */
	#modalLabel1 = "";
	/** @type {string} */
	#modalLabel2 = "";
	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: "open" });
		shadowRoot.appendChild(tableTemplate.content.cloneNode(true));
		const table = /** @type {HTMLElement} */ (
			shadowRoot.querySelector("table")
		);
		table.addEventListener("click", (e) => {
			this.#onClick(e);
		});
	}

	/**
	 * @param {IMatrixRowDiffCard} ic
	 */
	set ic(ic) {
		this.#navigate = ic.navigate !== null ? ic.navigate.bind(ic) : null;
		this.#discardChanges =
			ic.discardChanges !== null ? ic.discardChanges.bind(ic) : null;
		this.#modalLabel1 = ic.getModalLabel1();
		this.#modalLabel2 = ic.getModalLabel2();
		const title = ic.getTitle();
		const header1 = ic.getHeader1();
		const header2 = ic.getHeader2();
		const matrixRowValues1 = ic.getMatrixRowValues1();
		const matrixRowValues2 = ic.getMatrixRowValues2();
		const keys = getKeys(matrixRowValues1, matrixRowValues2);
		this.#tableRowsContent = [];
		for (const k of keys) {
			const key1 = getKeyAndValue(k, matrixRowValues1).key;
			const key2 = getKeyAndValue(k, matrixRowValues2).key;
			const value1 = getKeyAndValue(k, matrixRowValues1).value;
			const value2 = getKeyAndValue(k, matrixRowValues2).value;
			this.#tableRowsContent.push({ key1, key2, value1, value2 });
		}
		const navigate = ic.navigate;
		const discardChanges = ic.discardChanges;
		const table =
			/** @type {HTMLTableElement} */
			(this.shadowRoot?.querySelector("table"));
		const tBody = /** @type {HTMLElement} */ (table.querySelector("tbody"));

		ensureTableRows(keys.length, tBody);
		this.#displayTableHeader(title, header1, header2, navigate, discardChanges);
		this.#displayTableRows(this.#tableRowsContent);
	}

	/**
	 *
	 * @param {MouseEvent} e
	 */
	#onClick(e) {
		const target = e.target;
		if (target === null) {
			return;
		}
		// @ts-ignore
		const openButton = target.closest(".open");
		if (openButton !== null && this.#navigate !== null) {
			this.#navigate();
		}
		// @ts-ignore
		const resetButton = target.closest(".reset");
		if (resetButton !== null && this.#discardChanges !== null) {
			this.#discardChanges();
		}
		const tr = /** @type {HTMLTableRowElement} */ (
			// @ts-ignore
			target.closest("tr.matrix-row-diff-card-row")
		);
		if (tr === null) {
			return;
		}
		const i = this.#getClickedRowIndex(tr);
		if (i === null) {
			console.assert(i !== null, "No content found for that row index");
			return;
		}
		const content = this.#tableRowsContent[i];
		const key =
			content.key2 !== ""
				? getFilteredKey(content.key2)
				: getFilteredKey(content.key1);
		/** @type {IModalDiffCardValues} */
		const ic = {
			getKey: () => key,
			getValue1: () => content.value1,
			getValue2: () => content.value2,
			getLabel1: () => this.#modalLabel1,
			getLabel2: () => this.#modalLabel2,
			onClose: () => {},
		};
		const modal = new BnModalDiffCardValues();
		document.body.appendChild(modal);
		modal.show(ic);
	}

	/**
	 *
	 * @param {HTMLTableRowElement} tr
	 * @returns {number | null}
	 */
	#getClickedRowIndex(tr) {
		const tBody = /** @type {HTMLTableSectionElement} */ (
			this.shadowRoot?.querySelector("tbody")
		);
		for (let i = 0; i < tBody.children.length; i++) {
			if (tr === tBody.children[i]) {
				return i;
			}
		}
		return null;
	}
	/**
	 *
	 * @param {string} title
	 * @param {HeaderContent | null} header1
	 * @param {HeaderContent | null} header2
	 * @param {(() => void)|null} navigate
	 * @param {(() => void)|null} discardChanges
	 */
	#displayTableHeader(title, header1, header2, navigate, discardChanges) {
		const table = /** @type {HTMLTableElement} */ (
			this.shadowRoot?.querySelector("table")
		);
		const titleTh = /** @type {HTMLElement} */ (table.querySelector(".title"));
		const isTitleEmpty =
			title === "" && navigate === null && discardChanges === null;
		titleTh.classList.toggle("empty", isTitleEmpty);
		const subHeadersRow = /** @type {HTMLElement} */ (
			table.querySelector(".sub-headers-row")
		);
		subHeadersRow.classList.toggle("main-header", isTitleEmpty);
		if (title !== "") {
			const titleSpan = /** @type {HTMLElement} */ (
				titleTh.querySelector("span")
			);
			titleSpan.innerText = title;
		}
		const openButton = /** @type {BdIconButton} */ (
			titleTh.querySelector(".open")
		);
		openButton.icon = "openInNewWindow";
		openButton.title = "Open in new tab";
		openButton.classList.toggle("hidden", navigate === null);

		const resetButton = /** @type {BdIconButton} */ (
			titleTh.querySelector(".reset")
		);
		resetButton.icon = "reset";
		resetButton.title = "Discard changes";
		resetButton.classList.toggle("hidden", discardChanges === null);

		const headerContent1 =
			header1 === null
				? { name: "", user: "", time: "" }
				: {
						name: header1.name,
						user: header1.user,
						time: header1.time,
				  };
		const headerContent2 =
			header2 === null
				? { name: "", user: "", time: "" }
				: {
						name: header2.name,
						user: header2.user,
						time: header2.time,
				  };
		displayHeaderContent(headerContent1, "header1", table);
		displayHeaderContent(headerContent2, "header2", table);
	}

	/**
	 * @param {TableRowContent[]} tableRowsContent
	 */
	#displayTableRows(tableRowsContent) {
		const tBody = /** @type {HTMLElement} */ (
			this.shadowRoot?.querySelector("tbody")
		);
		const rows = tBody.children;
		for (let i = 0; i < tableRowsContent.length; i++) {
			const { key1, key2, value1, value2 } = tableRowsContent[i];
			const keySpan1 = /** @type {HTMLSpanElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-1 .key")
			);
			const keySpan2 = /** @type {HTMLSpanElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-2 .key")
			);
			const valueSpan1 = /** @type {HTMLSpanElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-1 .value")
			);
			const valueSpan2 = /** @type {HTMLSpanElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-2 .value")
			);
			keySpan1.textContent = getFilteredKey(key1);
			keySpan2.textContent = getFilteredKey(key2);
			valueSpan1.textContent = value1;
			valueSpan2.textContent = value2;
			const valuesChanged = value1 !== value2;
			const half1 = /** @type {HTMLTableCellElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-1")
			);
			const half2 = /** @type {HTMLTableCellElement} */ (
				rows[i].querySelector(".matrix-row-diff-card-row .half-2")
			);
			half1.classList.toggle("changed", valuesChanged);
			half2.classList.toggle("changed", valuesChanged);
		}
	}
}

/**
 *
 * @param {HeaderContent} rowHeader
 * @param {"header1" | "header2"} position
 * @param {HTMLTableElement} table
 */
function displayHeaderContent(rowHeader, position, table) {
	const headerRowDiv = /** @type {HTMLDivElement} */ (
		table.querySelector(`.matrix-row-diff-card .sub-${position} div`)
	);
	const rowNameSpan = /** @type {HTMLSpanElement} */ (
		headerRowDiv.querySelector("span.row-name")
	);
	const userNameSpan = /** @type {HTMLSpanElement} */ (
		headerRowDiv.querySelector("span.user-name")
	);
	const timeDateSpan = /** @type {HTMLSpanElement} */ (
		headerRowDiv.querySelector("span.time-date")
	);
	rowNameSpan.innerText = rowHeader.name;
	userNameSpan.innerText = rowHeader.user;
	timeDateSpan.innerText = rowHeader.time;
}

/**
 *
 * @param {string} key
 * @returns {string}
 */
function getFilteredKey(key) {
	for (const exKey of excludedKeys) {
		if (key.slice(0, exKey.length) === exKey) {
			return key.slice(exKey.length);
		}
	}
	return key;
}

/**
 * @param { string } k
 * @param { MatrixRowValues | null } row
 * @return {{ "key": string, "value": string }}
 */
function getKeyAndValue(k, row) {
	if (row === null) {
		return { key: "", value: "" };
	}
	const value = getMatrixValue(row, k);
	const key = value === "" ? "" : k;
	return { key, value };
}

/**
 *
 * @param {MatrixRowValues} row
 * @param {string} key
 * @returns {string}
 */
function getMatrixValue(row, key) {
	for (const [k, v] of row) {
		if (k === key) {
			return v;
		}
	}
	return "";
}

/**
 *
 * @param {MatrixRowValues|null} row1
 * @param {MatrixRowValues|null} row2
 * @returns {string[]}
 */
function getKeys(row1, row2) {
	/** @type {Set<string>} */
	const keys = new Set();
	if (row1 !== null) {
		for (const [k, _v] of row1) {
			keys.add(k);
		}
	}
	if (row2 !== null) {
		for (const [k, _v] of row2) {
			keys.add(k);
		}
	}
	return Array.from(keys);
}

/**
 *
 * @param {number} count
 * @param {HTMLElement} tbody
 */
function ensureTableRows(count, tbody) {
	const children = tbody.children;
	const len = children.length;
	for (let i = len; i < count; ++i) {
		tbody.appendChild(trTemplate.content.cloneNode(true));
	}
	for (let i = len; i > count; --i) {
		const child = children[i - 1];
		child.remove();
	}
}

customElements.define("bn-matrix-row-diff-card", BnMatrixRowDiffCard);

export { BnMatrixRowDiffCard, getKeys, getMatrixValue };
