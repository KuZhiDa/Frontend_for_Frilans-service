import Link from 'next/link'

export default function About() {
	return (
		<div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 p-8'>
			<div className='bg-white/80 backdrop-blur-md rounded-3xl p-10 max-w-3xl text-center shadow-lg'>
				<h1 className='text-4xl font-bold text-blue-700 mb-6'>
					Добро пожаловать на Skill Market
				</h1>
				<p className='text-lg text-gray-700 mb-6'>
					Skill Market — это современная платформа для фрилансеров и заказчиков.
					Создавайте проекты, находите исполнителей с подходящими навыками,
					обменивайтесь предложениями и успешно завершайте задачи в удобном
					интерфейсе.
				</p>
				<p className='text-lg text-gray-700 mb-8'>
					Независимо от того, ищете ли вы талантливого специалиста или хотите
					предложить свои услуги, Skill Market делает процесс простым и
					безопасным.
				</p>

				<div className='flex justify-center gap-4'>
					<Link
						href='/login'
						className='bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition shadow-md'
					>
						Войти
					</Link>
					<Link
						href='/register'
						className='bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition shadow-md'
					>
						Регистрация
					</Link>
				</div>
			</div>
		</div>
	)
}
