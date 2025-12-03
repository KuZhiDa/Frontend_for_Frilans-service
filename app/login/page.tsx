'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, LoginForm } from '@/lib/api'
import { saveUserData, getUserData } from '@/lib/storage'

interface FormErrors {
	login?: string
	password?: string
	role_user?: string
}

export default function LoginPage() {
	const router = useRouter()
	const [form, setForm] = useState<LoginForm>({
		login: '',
		password: '',
		role_user: 'E',
	})
	const [errors, setErrors] = useState<FormErrors>({})
	const [error, setError] = useState('')

	useEffect(() => {
		const { access_token, id_user } = getUserData()
		if (access_token) {
			router.replace(`/dashboard/${id_user}`)
		}
	}, [router])

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
		if (error) setError('')
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setErrors({})
		setError('')

		try {
			const response = await loginUser(form)
			if (response.access && response.id_user && response.role_user) {
				saveUserData({
					access_token: response.access,
					id_user: response.id_user,
					role_user: response.role_user,
				})
				router.push(`/dashboard/${response.id_user}`)
			} else if (response.id_user && response.role) {
				router.push(
					`/2fa?user_id=${response.id_user}&user_role=${response.role}`
				)
			} else {
				setError('Неизвестный ответ сервера')
			}
		} catch (err: any) {
			const message = err?.response?.data?.message
			
			if (message && typeof message === 'object' && !Array.isArray(message) && message !== null) {
				const messages: Record<string, Record<string, string>> = message
				const backendErrors: FormErrors = {}
				
				if (Object.keys(messages).length > 0) {
					Object.keys(messages).forEach(field => {
						const msgObj = messages[field]
						if (msgObj && typeof msgObj === 'object') {
							if (msgObj.isNotEmpty)
								backendErrors[field as keyof FormErrors] = msgObj.isNotEmpty
							else if (msgObj.isLength)
								backendErrors[field as keyof FormErrors] = msgObj.isLength
							else if (msgObj.isEmail)
								backendErrors[field as keyof FormErrors] = msgObj.isEmail
							else if (msgObj.matches)
								backendErrors[field as keyof FormErrors] = msgObj.matches
							else if (msgObj.isIn)
								backendErrors[field as keyof FormErrors] = msgObj.isIn
						}
					})
					setErrors(backendErrors)
					return
				}
			}
			
			const errorMessage = typeof message === 'string' 
				? message 
				: err?.message || 'Ошибка входа'
			setError(errorMessage)
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
					Вход
				</h1>

				<form onSubmit={handleSubmit}>
					<div className='mb-4'>
						<input
							name='login'
							placeholder='Логин'
							value={form.login}
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.login || error ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('login')}
					</div>

					<div className='mb-1 relative'>
						<input
							name='password'
							type='password'
							placeholder='Пароль'
							value={form.password}
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.password || error ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('password')}
						<div className='text-right mt-1'>
							<button
								type='button'
								onClick={() => router.push('/forgot-password')}
								className='text-sm text-blue-600 hover:underline'
							>
								Забыли пароль?
							</button>
						</div>
					</div>

					<div className='mb-4 flex gap-4'>
						<label className='flex items-center gap-2'>
							<input
								type='radio'
								name='role_user'
								value='E'
								checked={form.role_user === 'E'}
								onChange={handleChange}
								className='accent-blue-600'
							/>
							Исполнитель
						</label>
						<label className='flex items-center gap-2'>
							<input
								type='radio'
								name='role_user'
								value='C'
								checked={form.role_user === 'C'}
								onChange={handleChange}
								className='accent-blue-600'
							/>
							Заказчик
						</label>
					</div>

					{error && <p className='text-red-600 text-sm mb-2'>{error}</p>}

					<button
						type='submit'
						className='w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition'
					>
						Войти
					</button>
				</form>

				<p className='text-center mt-4 text-sm text-gray-600'>
					Нет аккаунта?{' '}
					<span
						onClick={() => router.push('/register')}
						className='text-blue-600 hover:underline cursor-pointer'
					>
						Зарегистрироваться
					</span>
				</p>
			</div>
		</div>
	)
}
