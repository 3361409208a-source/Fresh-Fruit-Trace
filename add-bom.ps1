$f = 'd:\xiangmu\Fresh-Fruit-Trace\start-all.ps1'
$bytes = [System.IO.File]::ReadAllBytes($f)
$bom = [byte[]]@(0xEF, 0xBB, 0xBF)
[System.IO.File]::WriteAllBytes($f, $bom + $bytes)
Write-Host "BOM added successfully"
