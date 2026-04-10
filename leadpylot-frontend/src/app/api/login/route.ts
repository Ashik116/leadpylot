import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
    const { email, password } = await req.json();

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--incognito'], // opens Chrome in incognito
    });

    // Just get the first page in incognito window
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        await page.goto(`${baseUrl}/sign-in`); // Use env variable for login URL

        await page.type('input[name="email"]', email);
        await page.type('input[name="password"]', password);
        await page.click('button[type="submit"]');

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Login failed:', err);
        return NextResponse.json({ success: false, error: err.message });
    }
}
