import styles from "./footer.module.css";

const footerLinks = [
	{
		href: "/mypage",
		label: "マイページ"
	},
	{
		href: "/terms",
		label: "利用規約"
	},
	{
		href: "/privacy-policy",
		label: "プライバシーポリシー"
	}
] as const;

export function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.inner}>
				<section aria-labelledby="source-heading" className={styles.source}>
					<h2 className={styles.sourceTitle} id="source-heading">
						出典
					</h2>
					<p className={styles.sourceText}>
						Risk Atlas は
						<a
							className={styles.sourceLink}
							href="https://www.ezairyu.mofa.go.jp/html/opendata/index.html"
						>
							外務省 海外安全情報 オープンデータ
						</a>
						を利用しています。
					</p>
				</section>

				<nav aria-label="Footer" className={styles.nav}>
					<ul className={styles.linkList}>
						{footerLinks.map((link) => (
							<li key={link.href}>
								<a className={styles.link} href={link.href}>
									{link.label}
								</a>
							</li>
						))}
					</ul>
				</nav>

				<p className={styles.copyright}>© 2026 Risk Atlas</p>
			</div>
		</footer>
	);
}
