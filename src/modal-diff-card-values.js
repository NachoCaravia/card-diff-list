import { BdIconButton } from "@bionamic/body";

/**
 * @typedef {object} IModalDiffCardValues
 * @property {()=> string} getKey
 * @property {()=> string} getValue1
 * @property {()=> string} getValue2
 * @property {()=> string} getLabel1
 * @property {()=> string} getLabel2
 * @property {()=> void} onClose
 */

const template = document.createElement("template");
// The styles are inlined to avoid a FOUC
template.innerHTML = `
    <style>
	.modal {
		box-sizing: border-box;
		border-color: var(--color-gray-200);
		border-width: var(--border-width);
		border-radius: 1rem;
		border-style: solid;
		padding: 0;
	}
	.modal .container {
		box-sizing: border-box;
		max-width: calc(100vw - 40px);
		max-height: calc(100vh - 40px);
		width: max-content;
		min-width: clamp(0px, 90vw - 30rem, 30rem);
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		row-gap: 1rem;
	}
	.modal .container.input-suggestions {
		min-width: clamp(0px, 40rem, 90vw);
	}
	.modal .content {
		overflow: auto;
	}
	.modal .title {
		font-family: var(--font-family-semi-bold);
		font-size: var(--font-size-h2);
		color: var(--color-gray-900);
	}
	.modal .buttons {
		display: flex;
		justify-content: flex-end;
		align-items: safe center;
		column-gap: 1rem;
	}
	.modal .confirm {
		width: 5.1rem;
		height: 36px;
		padding: 0 8px;
		border-width: 0;
		border-radius: var(--border-radius-md);
		font-family: var(--font-family-regular);
		font-size: var(--font-size-md);
		cursor: pointer;
	}
	.modal .confirm {
		color: white;
		background-color: var(--color-primary);
	}
	.modal .confirm:hover {
		background-color: #6461d1;
	}
	.modal.diff-card-values .container {
		width: auto;
	}
	.modal.diff-card-values .value-1,
	.modal.diff-card-values .value-2, 
	.modal.diff-card-values .key 
	{
		background-color: var(--color-gray-100);
		border-radius: var(--border-radius-md);
	}
	.modal.diff-card-values .value-1,
	.modal.diff-card-values .value-2 {
		padding: 8px 8px 12px 8px;
	}
	.modal.diff-card-values .key {
		padding: 4px 8px 4px 8px;
	}
	.modal.diff-card-values .values-container div:not(.label-container) {
		margin-bottom: 20px;
	}
	.modal.diff-card-values .values-container {
		padding-bottom: 24px;
	}
	.modal.diff-card-values .group-1.hidden,
	.modal.diff-card-values .group-2.hidden {
		display: none;
	}
	.modal.diff-card-values .title {
		font-weight: bold;
		padding-bottom: 16px;
	}
	.modal.diff-card-values h4 {
		line-height: 12px;
	}
	.modal.diff-card-values .text {
		overflow-wrap: break-word;
	}
	.modal.diff-card-values .label-container {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	</style>
    <dialog class="modal diff-card-values">
		<div class="container">
			<div class="content">
				<div class="title">Row details</div>
				<div class="values-container">
					<h4>Key name</h4>
					<div class="key">
						<span class="text"></span>
					</div>
					<div class="group-1">
						<div class="label-container label-1">
							<h4></h4>
							<bd-icon-button class="copy"></bd-icon-button>
						</div>
						<div class="value-1">
							<span class="text"></span>
						</div>
					</div>
					<div class="group-2">
						<div class="label-container label-2">
							<h4></h4>
							<bd-icon-button class="copy"></bd-icon-button>
						</div>
						<div class="value-2">
							<span class="text"></span>
						</div>
					</div>
				</div>
			</div>
			<form class="buttons">
				<div class="buttons">
					<button class="confirm">OK</button>
				</div>
			</form>
		</div>
    </dialog>
`;

class BnModalDiffCardValues extends HTMLElement {
	#value1 = "";
	#value2 = "";
	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: "open" });
		shadowRoot.appendChild(template.content.cloneNode(true));
		const dialog = /** @type {HTMLDialogElement} */ (
			shadowRoot.querySelector("dialog")
		);
		const iconButton1 = /** @type {BdIconButton} */ (
			this.shadowRoot?.querySelector(".label-1 .copy")
		);
		iconButton1.icon = "copy";
		iconButton1.title = "Copy value to clipboard";
		const iconButton2 = /** @type {BdIconButton} */ (
			this.shadowRoot?.querySelector(".label-2 .copy")
		);
		iconButton2.icon = "copy";
		iconButton2.title = "Copy value to clipboard";

		dialog.addEventListener("click", (e) => {
			const target = e.target;
			if (target === null) {
				return;
			}
			// @ts-ignore
			const confirmButton = target.closest("button.confirm");
			if (confirmButton !== null) {
				e.preventDefault();
				dialog.close();
			}
			// @ts-ignore
			const copyButton1 = target.closest(".label-1 .copy");
			if (copyButton1 !== null) {
				navigator.clipboard.writeText(this.#value1);
			}
			// @ts-ignore
			const copyButton2 = target.closest(".label-2 .copy");
			if (copyButton2 !== null) {
				navigator.clipboard.writeText(this.#value2);
			}
		});
	}

	/**
	 *
	 * @param {IModalDiffCardValues} ic
	 */
	show(ic) {
		this.#value1 = ic.getValue1();
		this.#value2 = ic.getValue2();
		const dialog = /** @type {HTMLDialogElement} */ (
			this.shadowRoot?.querySelector("dialog")
		);
		const keySpan = /** @type {HTMLSpanElement} */ (
			this.shadowRoot?.querySelector(".key span")
		);
		const group1Div = /** @type {HTMLDivElement} */ (
			this.shadowRoot?.querySelector(".group-1")
		);
		const group2Div = /** @type {HTMLDivElement} */ (
			this.shadowRoot?.querySelector(".group-2")
		);
		const value1Span = /** @type {HTMLSpanElement} */ (
			group1Div.querySelector("span")
		);
		const value2Span = /** @type {HTMLSpanElement} */ (
			group2Div.querySelector("span")
		);
		const label1Div = /** @type {HTMLDivElement} */ (
			group1Div.querySelector(".label-1")
		);
		const label2Div = /** @type {HTMLDivElement} */ (
			group2Div.querySelector(".label-2")
		);
		const label1Header = /** @type {HTMLElement} */ (
			label1Div.querySelector("h4")
		);
		const label2Header = /** @type {HTMLElement} */ (
			label2Div.querySelector("h4")
		);
		keySpan.innerText = ic.getKey();
		value1Span.innerText = this.#value1;
		value2Span.innerText = this.#value2;
		label1Header.innerText = ic.getLabel1();
		label2Header.innerText = ic.getLabel2();
		group1Div.classList.toggle("hidden", this.#value1 === "");
		group2Div.classList.toggle("hidden", this.#value2 === "");
		dialog.showModal();
	}
}

customElements.define("bn-modal-diff-card-values", BnModalDiffCardValues);

export { BnModalDiffCardValues };
