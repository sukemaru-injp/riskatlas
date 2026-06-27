import { Button } from "#/components/button";

import styles from "./header.module.css";

export function Header() {
	return (
		<header className={styles.header}>
			<a className={styles.brand} href="/">
				Risk Atlas
			</a>
			<nav aria-label="Primary" className={styles.nav}>
				<Button size="md" type="button" variant="surface">
					Login
				</Button>
			</nav>
		</header>
	);
}
