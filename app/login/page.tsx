'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, LoginForm } from '@/lib/api'
import { saveUserData, getUserData } from '@/lib/storage'

export default function LoginPage() {
	const router = useRouter()
	const [form, setForm] = useState<LoginForm>({
		login: '',
		password: '',
		role_user: 'E',
	})
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
		if (error) setError('')
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
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
			setError(err.message || 'Ошибка входа')
		}
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
								error ? 'border-red-500' : ''
							}`}
						/>
					</div>

					<div className='mb-1 relative'>
						<input
							name='password'
							type='password'
							placeholder='Пароль'
							value={form.password}
							onChange={handleChange}
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
								error ? 'border-red-500' : ''
							}`}
						/>
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
