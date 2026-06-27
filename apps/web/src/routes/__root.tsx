import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts
} from "@tanstack/react-router";

import { Header } from "#/components/header";
import appCss from "../styles.css?url";
import styles from "./root.module.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8"
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{
				title: "RiskAtlas"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss
			}
		]
	}),
	component: RootLayout,
	notFoundComponent: () => null,
	shellComponent: RootDocument
});

function RootLayout() {
	return (
		<>
			<Header />
			<main className={styles.homePage}>
				<Outlet />
			</main>
		</>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="root">{children}</div>
				<Scripts />
			</body>
		</html>
	);
}
