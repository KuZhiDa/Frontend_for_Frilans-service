'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_URL } from '@/lib/api'
import { fetchWithAuth } from '@/lib/authFetch'

export default function EmailVerificationPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get('token')

	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	)
	const [message, setMessage] = useState<string>('')
	const [resending, setResending] = useState(false)
	const [userId, setUserId] = useState<string | null>(null)

	const verifyEmail = async () => {
		if (!token) {
			setStatus('error')
			setMessage('Неверная ссылка подтверждения')
			return
		}

		try {
			setStatus('loading')
			setMessage('Подтверждаем вашу почту...')

			const res = await fetch(`${API_URL}/api/email/proof?token=${token}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data = await res.json()

			if (res.ok) {
				setStatus('success')
				setMessage('Почта успешно подтверждена! Можно закрыть страницу.')
			} else {
				setStatus('error')
				setMessage(data.message || 'Ошибка подтверждения почты')
			}
		} catch (err: any) {
			setStatus('error')
			setMessage('Ошибка соединения с сервером')
		}
	}

	const resendVerification = async () => {
		try {
			setResending(true)
			setMessage('Отправляем письмо...')

			const accessToken = localStorage.getItem('access_token')
			const currentUserId = localStorage.getItem('id_user')

			if (!currentUserId || !accessToken) {
				setMessage('Требуется авторизация для отправки письма')
				return
			}

			const res = await fetchWithAuth(`${API_URL}/api/email/send/${currentUserId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data = await res.json()

			if (res.ok) {
				setMessage('Письмо отправлено! Можно закрыть страницу.')
			} else {
				setMessage(data.message || 'Ошибка отправки письма')
			}
		} catch (err: any) {
			setMessage('Ошибка соединения с сервером')
		} finally {
			setResending(false)
		}
	}

	useEffect(() => {
		setUserId(localStorage.getItem('id_user'))
		verifyEmail()
	}, [token])

	return (
		<div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
			<div className='bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 w-full max-w-md'>
				<h1 className='text-2xl font-semibold text-blue-700 mb-6 text-center'>
					Подтверждение почты
				</h1>

				{status === 'loading' && (
					<div className='text-center'>
						<p className='text-gray-700 mb-4'>Проверяем вашу ссылку...</p>
						<div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto'></div>
					</div>
				)}

				{status === 'success' && (
					<div className='text-center'>
						<p className='text-green-700 font-medium mb-4'>{message}</p>
					</div>
				)}

				{status === 'error' && (
					<div className='text-center'>
						<p className='text-red-600 mb-4'>{message}</p>

						{!message.includes('отправлено') && (
							<div className='space-y-3'>
								<button
									onClick={resendVerification}
									disabled={resending}
									className={`w-full bg-blue-600 text-white rounded-lg py-2 transition ${
										resending
											? 'opacity-60 cursor-not-allowed'
											: 'hover:bg-blue-700'
									}`}
								>
									{resending ? 'Отправка...' : 'Отправить письмо заново'}
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
