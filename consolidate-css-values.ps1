# CSS Design Token Consolidation Script
# Replaces hardcoded values with design tokens across all CSS files

$replacements = @(
    # Border radius replacements
    @{ Pattern = 'border-radius:\s*6px'; Replacement = 'border-radius: var(--radius-sm)' },
    @{ Pattern = 'border-radius:\s*4px'; Replacement = 'border-radius: var(--radius-xs)' },
    @{ Pattern = 'border-radius:\s*8px'; Replacement = 'border-radius: var(--radius-md)' },
    @{ Pattern = 'border-radius:\s*10px'; Replacement = 'border-radius: var(--radius-md)' },
    @{ Pattern = 'border-radius:\s*12px'; Replacement = 'border-radius: var(--radius-lg)' },
    
    # Common spacing patterns - padding
    @{ Pattern = 'padding:\s*8px'; Replacement = 'padding: var(--space-xs)' },
    @{ Pattern = 'padding:\s*10px'; Replacement = 'padding: var(--space-xs)' },
    @{ Pattern = 'padding:\s*12px'; Replacement = 'padding: var(--space-sm)' },
    @{ Pattern = 'padding:\s*15px'; Replacement = 'padding: var(--space-sm)' },
    @{ Pattern = 'padding:\s*16px'; Replacement = 'padding: var(--space-md)' },
    @{ Pattern = 'padding:\s*20px'; Replacement = 'padding: var(--space-md)' },
    @{ Pattern = 'padding:\s*24px'; Replacement = 'padding: var(--space-lg)' },
    @{ Pattern = 'padding:\s*25px'; Replacement = 'padding: var(--space-lg)' },
    @{ Pattern = 'padding:\s*30px'; Replacement = 'padding: var(--space-xl)' },
    @{ Pattern = 'padding:\s*32px'; Replacement = 'padding: var(--space-xl)' },
    
    # Two-value padding patterns
    @{ Pattern = 'padding:\s*10px\s+20px'; Replacement = 'padding: var(--space-xs) var(--space-md)' },
    @{ Pattern = 'padding:\s*12px\s+16px'; Replacement = 'padding: var(--space-sm) var(--space-md)' },
    @{ Pattern = 'padding:\s*12px\s+20px'; Replacement = 'padding: var(--space-sm) var(--space-md)' },
    @{ Pattern = 'padding:\s*15px\s+20px'; Replacement = 'padding: var(--space-sm) var(--space-md)' },
    @{ Pattern = 'padding:\s*20px\s+30px'; Replacement = 'padding: var(--space-md) var(--space-xl)' },
    @{ Pattern = 'padding:\s*25px\s+30px'; Replacement = 'padding: var(--space-lg) var(--space-xl)' },
    
    # Margin patterns
    @{ Pattern = 'margin:\s*8px'; Replacement = 'margin: var(--space-xs)' },
    @{ Pattern = 'margin:\s*10px'; Replacement = 'margin: var(--space-xs)' },
    @{ Pattern = 'margin:\s*12px'; Replacement = 'margin: var(--space-sm)' },
    @{ Pattern = 'margin:\s*15px'; Replacement = 'margin: var(--space-sm)' },
    @{ Pattern = 'margin:\s*16px'; Replacement = 'margin: var(--space-md)' },
    @{ Pattern = 'margin:\s*20px'; Replacement = 'margin: var(--space-md)' },
    @{ Pattern = 'margin:\s*24px'; Replacement = 'margin: var(--space-lg)' },
    @{ Pattern = 'margin:\s*25px'; Replacement = 'margin: var(--space-lg)' },
    @{ Pattern = 'margin:\s*30px'; Replacement = 'margin: var(--space-xl)' },
    
    # Margin-top/bottom/left/right
    @{ Pattern = 'margin-(top|bottom|left|right):\s*8px'; Replacement = 'margin-$1: var(--space-xs)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*10px'; Replacement = 'margin-$1: var(--space-xs)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*12px'; Replacement = 'margin-$1: var(--space-sm)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*15px'; Replacement = 'margin-$1: var(--space-sm)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*16px'; Replacement = 'margin-$1: var(--space-md)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*20px'; Replacement = 'margin-$1: var(--space-md)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*24px'; Replacement = 'margin-$1: var(--space-lg)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*25px'; Replacement = 'margin-$1: var(--space-lg)' },
    @{ Pattern = 'margin-(top|bottom|left|right):\s*30px'; Replacement = 'margin-$1: var(--space-xl)' },
    
    # Gap patterns
    @{ Pattern = 'gap:\s*8px'; Replacement = 'gap: var(--space-xs)' },
    @{ Pattern = 'gap:\s*10px'; Replacement = 'gap: var(--space-xs)' },
    @{ Pattern = 'gap:\s*12px'; Replacement = 'gap: var(--space-sm)' },
    @{ Pattern = 'gap:\s*15px'; Replacement = 'gap: var(--space-sm)' },
    @{ Pattern = 'gap:\s*16px'; Replacement = 'gap: var(--space-md)' },
    @{ Pattern = 'gap:\s*20px'; Replacement = 'gap: var(--space-md)' },
    @{ Pattern = 'gap:\s*24px'; Replacement = 'gap: var(--space-lg)' },
    
    # Transition patterns
    @{ Pattern = 'transition:\s*all\s+0\.2s\s+ease'; Replacement = 'transition: all var(--transition-fast)' },
    @{ Pattern = 'transition:\s*all\s+0\.3s\s+ease'; Replacement = 'transition: all var(--transition-base)' },
    @{ Pattern = 'transition:\s*0\.2s\s+ease'; Replacement = 'var(--transition-fast)' },
    @{ Pattern = 'transition:\s*0\.3s\s+ease'; Replacement = 'var(--transition-base)' },
    @{ Pattern = 'transition:\s*border-color\s+0\.2s\s+ease'; Replacement = 'transition: border-color var(--transition-fast)' },
    @{ Pattern = 'transition:\s*background-color\s+0\.2s\s+ease'; Replacement = 'transition: background-color var(--transition-fast)' },
    @{ Pattern = 'transition:\s*color\s+0\.2s\s+ease'; Replacement = 'transition: color var(--transition-fast)' }
)

# Get all CSS files (excluding already-processed ones if needed)
$cssFiles = @(
    # Student portal files
    Get-ChildItem -Path "student-portal" -Recurse -Filter "*.css" -File |
        Where-Object { $_.FullName -notmatch 'archive' }
    
    # Admin files
    Get-ChildItem -Path "admin" -Recurse -Filter "*.css" -File
    
    # Public styles files
    Get-ChildItem -Path "styles" -Recurse -Filter "*.css" -File |
        Where-Object { $_.Name -notmatch 'design-tokens|colors|reset|typography' }
)

$totalFiles = $cssFiles.Count
$currentFile = 0
$totalReplacements = 0

Write-Host "Starting CSS consolidation across $totalFiles files..." -ForegroundColor Cyan

foreach ($file in $cssFiles) {
    $currentFile++
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($replacement in $replacements) {
        $matches = [regex]::Matches($content, $replacement.Pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $replacement.Pattern, $replacement.Replacement
            $fileReplacements += $matches.Count
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalReplacements += $fileReplacements
        Write-Host "[$currentFile/$totalFiles] Updated $($file.Name): $fileReplacements replacements" -ForegroundColor Green
    } else {
        Write-Host "[$currentFile/$totalFiles] Skipped $($file.Name): No changes needed" -ForegroundColor Gray
    }
}

Write-Host "`nConsolidation complete!" -ForegroundColor Cyan
Write-Host "Total files processed: $totalFiles" -ForegroundColor Yellow
Write-Host "Total replacements made: $totalReplacements" -ForegroundColor Yellow
