'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyTwoFactorCode } from '@/lib/api'
import { saveUserData } from '@/lib/storage'

export default function TwoFactorPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const userId = searchParams.get('user_id')
	const userRole = searchParams.get('user_role')

	const [code, setCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			if (!userId || !userRole) throw new Error('Неверные параметры для 2FA')

			const data = await verifyTwoFactorCode(userId, userRole, code)

			if (data.access) {
				saveUserData({
					access_token: data.access,
					id_user: userId,
					role_user: userRole,
				})
				router.push(`/dashboard/${userId}`)
			} else {
				throw new Error('Сервер не вернул access токен')
			}
		} catch (err: any) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 px-4'>
			<div className='bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 w-full max-w-md'>
				<h1 className='text-2xl font-semibold text-blue-700 mb-6 text-center'>
					Подтверждение входа
				</h1>

				<p className='text-center mb-4 text-gray-700'>
					Введите код подтверждения, отправленный на ваш телефон или email.
				</p>

				<form onSubmit={handleSubmit}>
					<input
						type='text'
						placeholder='Введите код'
						value={code}
						onChange={e => setCode(e.target.value)}
						className='w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400'
					/>

					{error && <p className='text-red-600 text-sm mb-2'>{error}</p>}

					<button
						type='submit'
						disabled={loading}
						className={`w-full rounded-lg py-2 text-white transition ${
							loading
								? 'bg-blue-400 cursor-not-allowed'
								: 'bg-blue-600 hover:bg-blue-700'
						}`}
					>
						{loading ? 'Проверка...' : 'Подтвердить'}
					</button>
				</form>
			</div>
		</div>
	)
}
