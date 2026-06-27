import type { ButtonHTMLAttributes } from "react";

import styles from "./button.module.css";

type ButtonVariant = "primary" | "surface";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

export function Button({
	className,
	size = "md",
	variant = "primary",
	...props
}: ButtonProps) {
	return (
		<button
			className={[styles.button, styles[variant], styles[size], className]
				.filter(Boolean)
				.join(" ")}
			{...props}
		/>
	);
}
