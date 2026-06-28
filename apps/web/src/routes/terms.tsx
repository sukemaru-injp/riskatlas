import { createFileRoute } from "@tanstack/react-router";

import styles from "./root.module.css";

export const Route = createFileRoute("/terms")({
	component: TermsPage
});

function TermsPage() {
	return (
		<section className={styles.placeholderPage}>
			<p className={styles.searchEyebrow}>Terms</p>
			<h1>利用規約</h1>
			<p>Not implemented yet.</p>
		</section>
	);
}
