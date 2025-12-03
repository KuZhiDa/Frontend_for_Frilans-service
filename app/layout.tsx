import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Auth App',
	description: 'Login & Register with Next.js + NestJS',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='ru'>
			<body>{children}</body>
		</html>
	)
}
