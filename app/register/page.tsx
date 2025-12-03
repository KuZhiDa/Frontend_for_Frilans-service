'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser, RegisterForm } from '@/lib/api'

interface FormErrors {
	username?: string
	email?: string
	phoneNumber?: string
	password?: string
}

export default function RegisterPage() {
	const router = useRouter()
	const [form, setForm] = useState<RegisterForm>({
		username: '',
		email: '',
		phoneNumber: '',
		password: '',
		is2Fa: false,
	})
	const [errors, setErrors] = useState<FormErrors>({})

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, type, value, checked } = e.target
		const newValue = type === 'checkbox' ? checked : value
		setForm({ ...form, [name]: newValue })

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

		try {
			const cleanedForm = { ...form }
			if (!cleanedForm.phoneNumber?.trim()) delete cleanedForm.phoneNumber
			cleanedForm.is2Fa = Boolean(cleanedForm.is2Fa)

			await registerUser(cleanedForm)
			router.push('/login')
		} catch (err: any) {
			const backendErrors: FormErrors = {}
			const messages: Record<string, Record<string, string>> = err?.response
				?.data?.message || {}

			Object.keys(messages).forEach(field => {
				const msgObj = messages[field]
				if (msgObj.isNotEmpty)
					backendErrors[field as keyof FormErrors] = msgObj.isNotEmpty
				else if (msgObj.isLength)
					backendErrors[field as keyof FormErrors] = msgObj.isLength
				else if (msgObj.isEmail)
					backendErrors[field as keyof FormErrors] = msgObj.isEmail
				else backendErrors[field as keyof FormErrors] = msgObj.matches
			})

			setErrors(backendErrors)
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
					Регистрация
				</h1>

				<form onSubmit={handleSubmit}>
					<div className='mb-4'>
						<input
							name='username'
							placeholder='Имя пользователя'
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.username ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('username')}
					</div>

					<div className='mb-4'>
						<input
							name='email'
							placeholder='Email'
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.email ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('email')}
					</div>

					<div className='mb-4'>
						<input
							name='phoneNumber'
							placeholder='Телефон (необязательно)'
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.phoneNumber ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('phoneNumber')}
					</div>

					<div className='mb-4'>
						<input
							name='password'
							type='password'
							placeholder='Пароль'
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								errors.password ? 'border-red-500' : ''
							}`}
						/>
						{renderFieldErrors('password')}
					</div>

					<div className='mb-4 flex items-center gap-2'>
						<input
							name='is2Fa'
							type='checkbox'
							id='is2Fa'
							checked={form.is2Fa}
							onChange={handleChange}
							className='checkbox accent-blue-600'
						/>
						<label htmlFor='is2Fa'>Включить двухфакторную аутентификацию</label>
					</div>

					<button
						type='submit'
						className='w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition'
					>
						Зарегистрироваться
					</button>
				</form>

				<p className='text-center mt-4 text-sm text-gray-600'>
					Уже есть аккаунт?{' '}
					<span
						onClick={() => router.push('/login')}
						className='text-blue-600 hover:underline cursor-pointer'
					>
						Войти
					</span>
				</p>
			</div>
		</div>
	)
}
