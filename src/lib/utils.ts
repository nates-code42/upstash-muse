import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse markdown links [text](url) to HTML <a> tags with styling
export function parseMarkdownLinks(text: string): string {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  return text.replace(markdownLinkRegex, (match, linkText, url) => {
    // Ensure URL is valid and starts with http/https
    const cleanUrl = url.trim();
    const validUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    
    return `<a href="${validUrl}" target="_blank" rel="noopener noreferrer" class="text-green-600 underline hover:text-green-700 transition-colors">${linkText}</a>`;
  });
}

// Ensure URLs have full domain for Circuit Board Medics
export function ensureFullUrl(url: string): string {
  if (!url) return url;
  
  // If it's a relative URL, add the domain
  if (url.startsWith('/')) {
    return `https://circuitboardmedics.com${url}`;
  }
  
  // If it already has a protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's missing protocol but has domain, add https
  return `https://${url}`;
}
