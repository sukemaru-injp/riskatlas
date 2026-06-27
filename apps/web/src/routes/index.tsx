import { createFileRoute } from "@tanstack/react-router";

import { AutoComplete } from "#/components/auto-complete";
import { Button } from "#/components/button";
import { COUNTRY_OPTIONS } from "#/constants/countries";
import styles from "./root.module.css";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<div className={styles.homeShell}>
			<div className={styles.homeCopy}>
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

				<Button size="lg" type="submit">
					検索
				</Button>
			</form>
		</div>
	);
}
