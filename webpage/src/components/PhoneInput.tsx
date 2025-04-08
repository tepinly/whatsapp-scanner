'use client'

import { useState, useEffect, useMemo } from 'react'
import {
	getCountries,
	getCountryCallingCode,
	parsePhoneNumberFromString,
} from 'libphonenumber-js'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Phone } from 'lucide-react'

interface PhoneInputProps {
	onChange: (value: string) => void
}

export default function PhoneInput({ onChange }: PhoneInputProps) {
	const [selectedCode, setSelectedCode] = useState('+1')
	const [phoneNumber, setPhoneNumber] = useState('')

	// Build an array of country options using libphonenumber-js API
	const countryOptions = useMemo(() => {
		return getCountries()
			.map((country) => {
				const callingCode = `+${getCountryCallingCode(country)}`
				return {
					code: country,
					label: `[${country}] ${country}: ${callingCode}`,
					callingCode,
				}
			})
			.sort((a, b) => a.label.localeCompare(b.label))
	}, [])

	useEffect(() => {
		if (!phoneNumber.startsWith('+')) return

		const timeout = setTimeout(() => {
			const parsed = parsePhoneNumberFromString(phoneNumber)
			if (parsed && parsed.countryCallingCode) {
				const newCode = `+${parsed.countryCallingCode}`

				// Check if the new country code is different from the selected one
				if (newCode !== selectedCode) {
					setSelectedCode(newCode)
					// If the new code is different, strip it off the phone number
					setPhoneNumber(phoneNumber.slice(newCode.length).trim())
				} else if (phoneNumber.startsWith(selectedCode)) {
					// If the phone number starts with the selected country code, remove it
					setPhoneNumber(phoneNumber.slice(selectedCode.length).trim())
				}
			}
		}, 500)

		return () => clearTimeout(timeout)
	}, [phoneNumber, selectedCode])

	// Update parent component with concatenated phone number
	useEffect(() => {
		onChange(`${selectedCode}${phoneNumber}`)
	}, [selectedCode, phoneNumber, onChange])

	// Handle country code change
	const handleCountryCodeChange = (value: string) => {
		setSelectedCode(value)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 w-full">
				{/* Country Code Selector */}
				<div className="w-full">
					<label className="text-sm text-zinc-400 mb-1.5 block">
						Country Code
					</label>
					<Select
						value={selectedCode}
						onValueChange={handleCountryCodeChange}
						defaultValue={selectedCode}
					>
						<SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white overflow-hidden whitespace-nowrap truncate text-ellipsis max-w-full">
							<SelectValue placeholder="Select country code" />
						</SelectTrigger>
						<SelectContent className="max-h-[300px] bg-zinc-800 border-zinc-700 text-white">
							{countryOptions.map(({ code, label, callingCode }) => (
								<SelectItem
									key={code}
									value={callingCode}
									className="focus:bg-zinc-700 focus:text-white data-[state=checked]:bg-blue-500/20"
								>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Phone Input Field - Completely separate from country code */}
				<div className="w-full">
					<label className="text-sm text-zinc-400 mb-1.5 block">
						Phone Number
					</label>
					<div className="flex gap-2">
						{/* Country code display in its own element */}
						<div className="flex items-center justify-center px-3 bg-zinc-900/50 border border-zinc-700 rounded-md min-w-[60px]">
							<span className="bg-gradient-to-r from-blue-500 to-green-400 text-transparent bg-clip-text font-medium">
								{selectedCode}
							</span>
						</div>

						{/* Phone input without any country code inside */}
						<div className="relative flex-1">
							<Input
								type="tel"
								value={phoneNumber}
								onChange={(e) => setPhoneNumber(e.target.value)}
								className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-green-400 pr-10 selection:bg-green-400 selection:text-white"
								placeholder="Phone number"
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
								<Phone className="h-4 w-4" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<p className="text-xs text-zinc-500 mt-1">
				Enter your WhatsApp number with country code to sync contacts
			</p>
		</div>
	)
}
