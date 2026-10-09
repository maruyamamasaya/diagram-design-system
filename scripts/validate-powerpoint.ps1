param([Parameter(Mandatory=$true)][string]$InputFile,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$InputFile=[IO.Path]::GetFullPath($InputFile)
$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($OutputDirectory)|Out-Null
Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class DiagramFonts{[DllImport("gdi32.dll",CharSet=CharSet.Unicode)]public static extern int AddFontResourceEx(string p,uint f,IntPtr z);[DllImport("gdi32.dll",CharSet=CharSet.Unicode)]public static extern bool RemoveFontResourceEx(string p,uint f,IntPtr z);}'
$mono=[IO.Path]::GetFullPath('assets/fonts/NotoSansMono-Regular.ttf')
$fontAdded=[DiagramFonts]::AddFontResourceEx($mono,0,[IntPtr]::Zero)
$app=New-Object -ComObject PowerPoint.Application
$existing=$app.Presentations.Count
$presentation=$null
try {
 $presentation=$app.Presentations.Open($InputFile,-1,0,0)
 $report=@{slides=$presentation.Slides.Count;widthPt=$presentation.PageSetup.SlideWidth;heightPt=$presentation.PageSetup.SlideHeight;pages=@();editing='not_verified'}
 foreach($slide in $presentation.Slides){
  $slide.Export((Join-Path $OutputDirectory ('{0:D3}.png' -f $slide.SlideIndex)),'PNG',1600,900)
  $texts=0;$tables=0;$connectors=0;$images=0;$shapes=0
  foreach($shape in $slide.Shapes){if($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1){$texts++};if($shape.HasTable -eq -1){$tables++};if($shape.Name -like 'edge-*-segment-*'){$connectors++};if($shape.Type -eq 13){$images++};$shapes++}
  $report.pages+=@{page=$slide.SlideIndex;texts=$texts;tables=$tables;connectors=$connectors;images=$images;objects=$shapes}
 }
 $presentation.Close();$presentation=$null
 $editPath=Join-Path $OutputDirectory 'edit-probe.pptx'
 Copy-Item -LiteralPath $InputFile -Destination $editPath
 $presentation=$app.Presentations.Open($editPath,0,0,0)
 $title=@($presentation.Slides.Item(1).Shapes | Where-Object {$_.HasTextFrame -eq -1})[0]
 $title.TextFrame.TextRange.Text='編集確認'
 $table=@($presentation.Slides.Item(3).Shapes | Where-Object {$_.HasTable -eq -1})[0]
 $table.Table.Cell(2,2).Shape.TextFrame.TextRange.Text='編集確認セル'
 $connector=@($presentation.Slides.Item(5).Shapes | Where-Object {$_.Name -like 'edge-*-segment-*'})[0]
 $originalLeft=$connector.Left;$connector.Left=$originalLeft+2
 $node=@($presentation.Slides.Item(5).Shapes | Where-Object {$_.Name -like 'node-*' -and $_.Type -eq 1})[0]
 $nodeOriginalLeft=$node.Left;$node.Left=$node.Left+2
 $presentation.Save();$presentation.Close();$presentation=$null
 $presentation=$app.Presentations.Open($editPath,-1,0,0)
 $title=@($presentation.Slides.Item(1).Shapes | Where-Object {$_.HasTextFrame -eq -1})[0]
 $table=@($presentation.Slides.Item(3).Shapes | Where-Object {$_.HasTable -eq -1})[0]
 $connector=@($presentation.Slides.Item(5).Shapes | Where-Object {$_.Name -like 'edge-*-segment-*'})[0]
 $node=@($presentation.Slides.Item(5).Shapes | Where-Object {$_.Name -like 'node-*' -and $_.Type -eq 1})[0]
 if([Math]::Abs($node.Left-($nodeOriginalLeft+2)) -gt 0.1){throw 'Node edit persistence failed'}
 if($title.TextFrame.TextRange.Text -ne '編集確認' -or $table.Table.Cell(2,2).Shape.TextFrame.TextRange.Text -ne '編集確認セル' -or [Math]::Abs($connector.Left-($originalLeft+2)) -gt 0.1){throw 'PowerPoint editing persistence failed'}
 $report.editing='text_table_node_connector_saved_and_reopened'
 $report|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $OutputDirectory 'powerpoint.json') -Encoding utf8
}finally {if($presentation){$presentation.Close()};if($existing -eq 0){$app.Quit()};[Runtime.InteropServices.Marshal]::ReleaseComObject($app)|Out-Null;if($fontAdded -gt 0){[DiagramFonts]::RemoveFontResourceEx($mono,0,[IntPtr]::Zero)|Out-Null}}
