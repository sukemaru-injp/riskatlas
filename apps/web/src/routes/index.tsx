import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { createFileRoute } from "@tanstack/react-router";

import styles from "./root.module.css";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<main className={styles.homePage}>
			<div className={styles.homeShell}>
				<div className={styles.homeCopy}>
					<p className={styles.homeKicker}>Risk Atlas</p>
					<h1>旅先のリスクを事前に確認する</h1>
					<p className={styles.homeDescription}>
						国名から、渡航前に確認したい安全情報を検索できます。
					</p>
				</div>

				<form action="/" className={styles.searchForm} method="get">
					<Field.Root className={styles.searchField}>
						<Field.Label className={styles.searchLabel}>国名</Field.Label>
						<Input
							className={styles.searchInput}
							name="country"
							placeholder="例: タイ、フランス"
						/>
					</Field.Root>

					<Button className={styles.searchButton} type="submit">
						検索
					</Button>
				</form>
			</div>
		</main>
	);
}
