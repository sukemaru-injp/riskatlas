import { createFileRoute } from "@tanstack/react-router";

import styles from "./root.module.css";

export const Route = createFileRoute("/mypage")({
	component: MyPage
});

function MyPage() {
	return (
		<section className={styles.placeholderPage}>
			<p className={styles.searchEyebrow}>My page</p>
			<h1>マイページ</h1>
			<p>Not implemented yet.</p>
		</section>
	);
}
