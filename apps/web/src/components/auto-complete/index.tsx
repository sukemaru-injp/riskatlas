import { useId, useMemo, useRef, useState } from "react";

import styles from "./auto-complete.module.css";

export type AutoCompleteOption = {
	label: string;
	value: string;
	keywords?: readonly string[];
};

type AutoCompleteProps = {
	name: string;
	options: readonly AutoCompleteOption[];
	label?: string;
	placeholder?: string;
	emptyMessage?: string;
	maxResults?: number;
	defaultValue?: string;
	className?: string;
};

function normalizeSearchText(value: string) {
	return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function AutoComplete({
	name,
	options,
	label,
	placeholder,
	emptyMessage = "一致する候補がありません",
	maxResults = 8,
	defaultValue = "",
	className
}: AutoCompleteProps) {
	const id = useId();
	const listboxId = `${id}-listbox`;
	const [inputValue, setInputValue] = useState(defaultValue);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const rootRef = useRef<HTMLDivElement>(null);

	const matches = useMemo(() => {
		const query = normalizeSearchText(inputValue);

		if (!query) {
			return options.slice(0, maxResults);
		}

		return options
			.filter((option) => {
				const haystack = [
					option.label,
					option.value,
					...(option.keywords ?? [])
				]
					.join(" ")
					.normalize("NFKC")
					.toLocaleLowerCase();

				return haystack.includes(query);
			})
			.slice(0, maxResults);
	}, [inputValue, maxResults, options]);

	const activeOption = activeIndex >= 0 ? matches[activeIndex] : undefined;

	function selectOption(option: AutoCompleteOption) {
		setInputValue(option.value);
		setIsOpen(false);
		setActiveIndex(-1);
	}

	function moveActiveIndex(nextIndex: number) {
		if (matches.length === 0) {
			setActiveIndex(-1);
			return;
		}

		const lastIndex = matches.length - 1;
		setActiveIndex(Math.min(Math.max(nextIndex, 0), lastIndex));
	}

	return (
		<div
			className={[styles.root, className].filter(Boolean).join(" ")}
			ref={rootRef}
		>
			{label ? (
				<label className={styles.label} htmlFor={id}>
					{label}
				</label>
			) : null}
			<div className={styles.control}>
				<input
					aria-activedescendant={
						activeOption ? `${id}-option-${activeIndex}` : undefined
					}
					aria-autocomplete="list"
					aria-controls={listboxId}
					aria-expanded={isOpen}
					autoComplete="off"
					className={styles.input}
					id={id}
					name={name}
					onBlur={() => {
						setIsOpen(false);
						setActiveIndex(-1);
					}}
					onChange={(event) => {
						setInputValue(event.target.value);
						setIsOpen(true);
						setActiveIndex(-1);
					}}
					onFocus={() => {
						setIsOpen(true);
					}}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setIsOpen(true);
							moveActiveIndex(activeIndex + 1);
							return;
						}

						if (event.key === "ArrowUp") {
							event.preventDefault();
							setIsOpen(true);
							moveActiveIndex(
								activeIndex === -1 ? matches.length - 1 : activeIndex - 1
							);
							return;
						}

						if (event.key === "Enter" && isOpen && activeOption) {
							event.preventDefault();
							selectOption(activeOption);
							return;
						}

						if (event.key === "Escape") {
							setIsOpen(false);
							setActiveIndex(-1);
						}
					}}
					placeholder={placeholder}
					role="combobox"
					type="text"
					value={inputValue}
				/>
			</div>

			{isOpen ? (
				<div className={styles.popover}>
					{matches.length > 0 ? (
						<div className={styles.listbox} id={listboxId} role="listbox">
							{matches.map((option, index) => (
								<div
									aria-selected={index === activeIndex}
									className={styles.option}
									id={`${id}-option-${index}`}
									key={`${option.value}-${option.label}`}
									onMouseDown={(event) => {
										event.preventDefault();
										selectOption(option);
									}}
									role="option"
									tabIndex={-1}
								>
									{option.label}
								</div>
							))}
						</div>
					) : (
						<p className={styles.empty}>{emptyMessage}</p>
					)}
				</div>
			) : null}
		</div>
	);
}
