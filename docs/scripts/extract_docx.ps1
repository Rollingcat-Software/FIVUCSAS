$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\docs\PSD.docx", $false, $true)
$text = $doc.Content.Text
$text | Out-File -FilePath "C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\docs\PSD_extracted.txt" -Encoding UTF8
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Text extracted successfully"
