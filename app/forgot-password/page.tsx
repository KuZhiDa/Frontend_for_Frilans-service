'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendEmail } from '@/lib/api'

interface FormState {
	login: string
}

export default function ForgotPasswordPage() {
	const router = useRouter()
	const [form, setForm] = useState<FormState>({ login: '' })
	const [error, setError] = useState<string>('')
	const [loading, setLoading] = useState<boolean>(false)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setForm({ ...form, [name]: value })
		if (error) setError('')
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const response = await sendEmail(form)

			router.push('/waiting')
		} catch (err: any) {
			setError(err.message || 'Не удалось отправить запрос')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
			<div className='bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 w-full max-w-md'>
				<h1 className='text-2xl font-semibold text-blue-700 mb-6 text-center'>
					Сброс пароля
				</h1>

				<form onSubmit={handleSubmit}>
					<div className='mb-4'>
						<input
							name='login'
							placeholder='Введите логин'
							value={form.login}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400'
						/>
					</div>

					{error && (
						<p className='text-red-600 text-sm mb-3 text-left break-words'>
							{error}
						</p>
					)}

					<button
						type='submit'
						disabled={loading}
						className={`w-full bg-blue-600 text-white rounded-lg py-2 transition ${
							loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
						}`}
					>
						{loading ? 'Отправка...' : 'Сбросить пароль'}
					</button>
				</form>

				<p className='text-center mt-4 text-sm text-gray-600'>
					Вспомнили пароль?{' '}
					<span
						onClick={() => router.push('/login')}
						className='text-blue-600 hover:underline cursor-pointer'
					>
						Вернуться ко входу
					</span>
				</p>
			</div>
		</div>
	)
}
