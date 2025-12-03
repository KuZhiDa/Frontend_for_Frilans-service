'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/api'

interface FormState {
	password: string
}

interface FormErrors {
	password?: string
	token?: string
}

export default function ResetPasswordPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [form, setForm] = useState<FormState>({ password: '' })
	const [errors, setErrors] = useState<FormErrors>({})
	const [loading, setLoading] = useState<boolean>(false)
	const [success, setSuccess] = useState<boolean>(false)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setForm({ ...form, [name]: value })

		if (errors[name as keyof FormErrors]) {
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[name as keyof FormErrors]
				return newErrors
			})
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setErrors({})
		setLoading(true)

		try {
			const token = searchParams.get('token')
			if (!token) {
				setErrors({ token: 'Токен отсутствует или недействителен.' })
				setLoading(false)
				return
			}

			await resetPassword(token, form.password)
			setSuccess(true)
			setTimeout(() => router.push('/login'), 2000)
		} catch (err: any) {
			const backendErrors: FormErrors = {}
			const messages: Record<string, Record<string, string>> = err?.response
				?.data?.message || {}

			Object.keys(messages).forEach(field => {
				if (messages[field].isNotEmpty) {
					backendErrors[field as keyof FormErrors] = messages[field].isNotEmpty
				} else if (messages[field].isLength) {
					backendErrors[field as keyof FormErrors] = messages[field].isLength
				} else {
					backendErrors[field as keyof FormErrors] = messages[field].matches
				}
			})

			if (Object.keys(backendErrors).length === 0) {
				backendErrors.password = err.message || 'Ошибка при сбросе пароля.'
			}

			setErrors(backendErrors)
		} finally {
			setLoading(false)
		}
	}

	const renderFieldErrors = (field: keyof FormErrors) => {
		const msg = errors[field]
		if (!msg) return null
		return <p className='text-red-600 text-sm mt-1'>{msg}</p>
	}

	return (
		<div className='flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
			<div className='bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 w-full max-w-md'>
				<h1 className='text-2xl font-semibold text-blue-700 mb-6 text-center'>
					Сброс пароля
				</h1>

				{success ? (
					<div className='text-center'>
						<p className='text-green-700 font-medium mb-4'>
							Пароль успешно изменён! Перенаправление на экран входа...
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className='mb-4'>
							<input
								name='password'
								type='password'
								placeholder='Введите новый пароль'
								onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.password ? 'border-red-500' : ''
							}`}
							/>
							{renderFieldErrors('password')}
							{renderFieldErrors('token')}
						</div>

						<button
							type='submit'
							disabled={loading}
							className={`w-full bg-blue-600 text-white rounded-lg py-2 mt-2 transition ${
								loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
							}`}
						>
							{loading ? 'Отправка...' : 'Сбросить пароль'}
						</button>
					</form>
				)}

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
