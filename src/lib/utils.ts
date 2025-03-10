import { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function csvToJson(file: File): Promise<any[]> {
  const Papa = await import('papaparse');
  
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as any[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function extractSheetsFromExcel(file: File): Promise<{ [sheetName: string]: any[] }> {
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets: { [sheetName: string]: any[] } = {};
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          sheets[sheetName] = jsonData;
        });
        
        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}
