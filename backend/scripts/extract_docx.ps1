Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = "c:\Users\thinnakorn\Downloads\SRS_Carment-Cloud.docx"
$outPath = "d:\New-carmen\docx_content.xml"
$z = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$e = $z.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$stream = $e.Open()
$reader = New-Object System.IO.StreamReader($stream)
$reader.ReadToEnd() | Out-File -FilePath $outPath -Encoding UTF8
$reader.Close()
$z.Dispose()
Write-Host "Extracted to $outPath"
