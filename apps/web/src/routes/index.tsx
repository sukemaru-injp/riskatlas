import { Button } from "@base-ui/react/button";
import { createFileRoute } from "@tanstack/react-router";

import { AutoComplete } from "#/components/auto-complete";
import { COUNTRY_OPTIONS } from "#/constants/countries";
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
					<AutoComplete
						label="国名"
						name="country"
						options={COUNTRY_OPTIONS}
						placeholder="例: タイ、フランス"
					/>

					<Button className={styles.searchButton} type="submit">
						検索
					</Button>
				</form>
			</div>
		</main>
	);
}
