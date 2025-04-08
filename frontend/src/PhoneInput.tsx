import { useState, useEffect } from 'react'
import * as countryCodes from 'country-codes-list'

const countries = countryCodes.customList(
	'countryCode',
	'[{countryCode}] {countryNameEn}: +{countryCallingCode}'
)

interface PhoneInputProps {
	onChange: (value: string) => void
}

const PhoneInput = ({ onChange }: PhoneInputProps) => {
	const [selectedCode, setSelectedCode] = useState('+1')
	const [phoneNumber, setPhoneNumber] = useState('')

	const countryOptions = Object.entries(countries)
		.map(([code, label]) => {
			const match = label.match(/\+(\d+)/)
			return {
				code,
				label,
				callingCode: match ? `+${match[1]}` : '',
			}
		})
		.sort((a, b) => a.label.localeCompare(b.label))

	useEffect(() => {
		onChange(`${selectedCode}${phoneNumber}`)
	}, [selectedCode, phoneNumber, onChange])

	return (
		<div className="flex items-center justify-between gap-2 w-full text-white mb-4">
			<select
				className="bg-black text-white border border-green-600 rounded px-2 py-2 text-sm focus:outline-none w-[35%]"
				value={selectedCode}
				onChange={(e) => setSelectedCode(e.target.value)}
			>
				{countryOptions.map(({ code, label, callingCode }) => (
					<option key={code} value={callingCode}>
						{label}
					</option>
				))}
			</select>

			<div className="relative w-full">
				<span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
					{selectedCode}
				</span>
				<input
					type="tel"
					value={phoneNumber}
					onChange={(e) => setPhoneNumber(e.target.value)}
					className="pl-16 pr-3 py-2 w-full bg-black text-white border border-green-600 rounded text-sm focus:outline-none"
					placeholder="Phone number"
				/>
			</div>
		</div>
	)
}

export default PhoneInput
