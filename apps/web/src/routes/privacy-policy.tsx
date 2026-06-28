import { createFileRoute } from "@tanstack/react-router";

import styles from "./root.module.css";

export const Route = createFileRoute("/privacy-policy")({
	component: PrivacyPolicyPage
});

function PrivacyPolicyPage() {
	return (
		<section className={styles.placeholderPage}>
			<p className={styles.searchEyebrow}>Privacy policy</p>
			<h1>プライバシーポリシー</h1>
			<p>Not implemented yet.</p>
		</section>
	);
}
