import type { Button as BaseButtonType } from "@base-ui/react/button";
import { Button as BaseButton } from "@base-ui/react/button";

import styles from "./button.module.css";

type ButtonVariant = "primary" | "surface";
type ButtonSize = "md" | "lg";

type ButtonProps = BaseButtonType.Props & {
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
		<BaseButton
			className={[styles.button, styles[variant], styles[size], className]
				.filter(Boolean)
				.join(" ")}
			{...props}
		/>
	);
}
