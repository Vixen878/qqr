"use client"

import { PayloadDisplay } from '@/components/PayloadDisplay'
import { buildEMVQR } from '@/lib/emvqr'
import React, { useState, useEffect } from 'react'
import { QrCodeDisplay } from '@/components/QrCodeDisplay'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BuildParams } from '@/lib/types'
import Link from 'next/link'


// CBE Specific constants
const CBE_BIC = 'CBETETAA';

function CbeQrGenerator() {
  const [merchantName, setMerchantName] = useState<string>('Sample Merchant');
  const [merchantCity, setMerchantCity] = useState<string>('Addis Ababa');
  const [accountNumber, setAccountNumber] = useState<string>('1000123456789');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [payload, setPayload] = useState<string>('');

  useEffect(() => {
    const isDynamic = amount.trim() !== '';

    if (!merchantName || !merchantCity || !accountNumber) {
      setPayload('');
      return;
    }

    const params: BuildParams = {
      poiMethod: isDynamic ? '12' : '11',
      merchantName,
      merchantCity,
      amount: isDynamic ? amount : undefined,
      mai28: {
        bic: CBE_BIC,
        accountOrPhone: accountNumber,
      },
      addl: {
        purpose: purpose.trim() ? purpose.trim() : undefined,
      }
    };
    const newPayload = buildEMVQR(params);
    setPayload(newPayload);

  }, [merchantName, merchantCity, accountNumber, amount, purpose]);

  const qrUrl = payload ? `/api/qr?payload=${encodeURIComponent(payload)}` : '#';
  const isDynamic = amount.trim() !== '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top header and platform summary */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
          <div className='flex justify-between'>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CBE EMVCo QR Generator (Experimental)</h1>
            <Link href="/advanced" passHref>
              <Button className="ml-4">Advanced</Button>
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Builds EMVCo-compliant payment QR payloads for the Commercial Bank of Ethiopia (CBE), aligned with IPS‑ET.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">EMV TLV + CRC</h3>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Generates Tag‑Length‑Value and CRC‑16/CCITT‑FALSE.</p>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Static & Dynamic</h3>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">POI Method 11 static, 12 dynamic when amount is set.</p>
            </div>
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preview & Inspect</h3>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">QR SVG preview and payload breakdown included.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="rounded-lg border bg-white dark:bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Merchant Details</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Enter the fields to generate a compliant payload.</p>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="merchantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Merchant Name
                </label>
                <Input id="merchantName" type="text" value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="Doing business as name" />
              </div>

              <div>
                <label htmlFor="merchantCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Merchant City
                </label>
                <Input id="merchantCity" type="text" value={merchantCity} onChange={e => setMerchantCity(e.target.value)} placeholder="e.g., Addis Ababa" />
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CBE Account Number
                </label>
                <Input id="accountNumber" type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Merchant's CBE account" />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (Optional)
                  <span className="text-xs text-gray-500 ml-2">Sets dynamic single-use QR when present</span>
                </label>
                <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 150.00" />
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Purpose of Transaction (Optional)
                </label>
                <Input id="purpose" type="text" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., Invoice 123, School Fee" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-8">
            <div className="rounded-lg border bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">QR Preview</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{isDynamic ? 'Dynamic' : 'Static'}</span>
                  <span className="mx-2">•</span>
                  <span>POI {isDynamic ? '12' : '11'}</span>
                  <span className="mx-2">•</span>
                  <span>Len: {payload.length}</span>
                </div>
              </div>

              <div className="mt-6">
                <QrCodeDisplay payload={payload} />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={() => navigator.clipboard.writeText(payload)} disabled={!payload}>
                  Copy Payload
                </Button>
                <a
                  href={qrUrl}
                  className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium border ${payload
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'opacity-50 pointer-events-none text-gray-500 dark:text-gray-400'
                    }`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open SVG
                </a>
              </div>
            </div>

            <div className="rounded-lg border bg-white dark:bg-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payload Inspector</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Tag, length, and value breakdown of the generated TLV.</p>
              <div className="mt-4">
                <PayloadDisplay payload={payload} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
export default CbeQrGenerator
