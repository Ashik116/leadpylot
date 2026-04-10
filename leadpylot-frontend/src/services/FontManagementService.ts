import ApiService from './ApiService';

export interface FontInfo {
  id?: string;
  name: string;
  font_family: string;
  type: 'standard' | 'system' | 'uploaded';
  file_path?: string;
  file_size?: number;
  format?: string;
  preview_text: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface FontOption {
  value: string | null;
  label: string;
  description: string;
  type: 'default' | 'standard' | 'system' | 'uploaded';
}

export interface AvailableFontsResponse {
  success: boolean;
  data: {
    standard: FontInfo[];
    system: FontInfo[];
    uploaded: FontInfo[];
    total: number;
  };
  message: string;
}

export interface FontUploadResponse {
  success: boolean;
  data?: FontInfo;
  error?: string;
  message?: string;
}

export interface FontDeleteResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    font_family: string;
  };
  error?: string;
  message?: string;
}

export interface FontOptionsResponse {
  success: boolean;
  data: {
    font_options: FontOption[];
    categories: {
      standard: number;
      system: number;
      uploaded: number;
    };
    total: number;
  };
}

/**
 * Font Management Service
 * Handles font discovery, upload, and management
 */
export class FontManagementService {
  
  /**
   * Get all available fonts (system + uploaded)
   */
  static async getAvailableFonts(): Promise<AvailableFontsResponse> {
    const config = {
      url: '/admin/fonts',
      method: 'GET' as const,
    };

    return ApiService.fetchDataWithAxios<AvailableFontsResponse>(config);
  }

  /**
   * Get font options for dropdown selection
   */
  static async getFontOptions(): Promise<FontOptionsResponse> {
    const config = {
      url: '/admin/fonts/options',
      method: 'GET' as const,
    };

    return ApiService.fetchDataWithAxios<FontOptionsResponse>(config);
  }

  /**
   * Upload new font file
   */
  static async uploadFont(fontFile: File): Promise<FontUploadResponse> {
    const formData = new FormData();
    formData.append('fontFile', fontFile);

    const config = {
      url: '/admin/fonts/upload',
      method: 'POST' as const,
      data: formData as any,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    return ApiService.fetchDataWithAxios<FontUploadResponse>(config);
  } 

  /**
   * Delete an uploaded font
   */
  static async deleteFont(fontId: string): Promise<FontDeleteResponse> {
    const config = {
      url: `/admin/fonts/${fontId}`,
      method: 'DELETE' as const,
    };

    return ApiService.fetchDataWithAxios<FontDeleteResponse>(config);
  }

  /**
   * Preview font with sample text
   */
  static async previewFont(fontFamily: string, sampleText?: string) {
    const config = {
      url: '/admin/fonts/preview',
      method: 'POST' as const,
      data: {
        font_family: fontFamily,
        sample_text: sampleText,
      },
    };

    return ApiService.fetchDataWithAxios(config);
  }

  /**
   * Validate font file before upload
   */
  static validateFontFile(file: File): { valid: boolean; error?: string } {
    const supportedFormats = ['.ttf', '.otf', '.woff', '.woff2'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `Unsupported font format. Supported formats: ${supportedFormats.join(', ')}`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Font file too large. Maximum size: 10MB'
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get font preview CSS
   */
  static getFontPreviewCSS(fontFamily: string): string {
    return `font-family: "${fontFamily}", sans-serif;`;
  }
}

export default FontManagementService;