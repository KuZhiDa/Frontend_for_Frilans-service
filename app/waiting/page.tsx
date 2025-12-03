export default function WaitingPage() {
	return (
		<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200'>
			<div className='bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center'>
				<h1 className='text-2xl font-semibold text-blue-700 mb-4'>
					Подтверждение пароля
				</h1>
				<p className='text-gray-700'>
					Для сброса пароля перейдите по ссылке указанной в письме, отправленном
					вам на почту. Эту страницу можно закрыть.
				</p>
			</div>
		</div>
	)
}
