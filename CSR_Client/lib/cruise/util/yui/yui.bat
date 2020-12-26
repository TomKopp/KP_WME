@ECHO OFF
rem ;; Batch Datei fuer CRUISe JS-Dateien ;;

rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

rem ;; Dateiname fuer die minified JS-Datei, das min wird im Skript weiter unten angehangen
set YUI_FILE_NAME=tsr

rem ;; Verzeichnis vom YUI-Compressor
set YUI_FOLDER=lib

rem ;; die Versions des YUI-Compressor setzen
set YUI_VERSION=2.4.2

rem ;; bei allen Pfaden koennen absolute oder relative Angaben benutzt werden

rem ;; Verzeichnis und Dateiangabe fuer die JS-Text-Datei, welche die Reihenfolge angibt
set YUI_TEXT_LIST=js-list.txt

rem ;; das Verzeichnis, wo die minified JS-Datei hin soll
set YUI_FOLDER_DEST=..\..\target

rem ;; das Verzeichnis mit den JS-Dateien
set YUI_FOLDER_SRC=..\..

rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

rem ;; die Textdatei oeffnen und jeden String nach Delimiter auslesen
for /f "delims=" %%G in (%YUI_TEXT_LIST%) do (
	
	rem ;; wenn Datei auch wirklich im Ordner vorhanden ist
	if exist "%YUI_FOLDER_SRC%\%%G" (
		
		rem ;; wenn oben ein Ordner angeben wurde
		if defined YUI_FOLDER_SRC (

			rem ;; den Inhalt der Datei ans Ende der merged.js anhaengen
			type "%YUI_FOLDER_SRC%\%%G">>"%YUI_FOLDER%\merged.js"

		)

	)
	
	rem ;; Fehlerausgabe, wenn die Datei nicht im Ordner vorhanden ist
	if not exist "%YUI_FOLDER_SRC%\%%G" (

		echo Die Datei "%YUI_FOLDER_SRC%\%%G" gibt es nicht. 
		echo Pruefen Sie die Angabe und fuehren Sie das Skript erneut aus.
		echo.
		echo Druecken Sie eine Taste zum Beenden.
		del %YUI_FOLDER%\merged.js
		pause>nul
		exit

	)


)

rem ;; yuicompressor mit der zusammengefuegten merged.js ausfuehren
java -jar "%YUI_FOLDER%\yuicompressor-%YUI_VERSION%.jar" --charset=UTF-8 --type=js "%YUI_FOLDER%\merged.js" -o "%YUI_FOLDER%\%YUI_FILE_NAME%.min.js"

rem ;; Datei in das obengenannten Verzeichnis kopieren
xcopy /Y /V /R /Q /Z "%YUI_FOLDER%\%YUI_FILE_NAME%.min.js" "%YUI_FOLDER_DEST%\%YUI_FILE_NAME%.min.js"

rem ;; unkomprimierte Datei in das obengenannten Verzeichnis kopieren
xcopy /Y /V /R /Q /Z "%YUI_FOLDER%\merged.js" "%YUI_FOLDER_DEST%\%YUI_FILE_NAME%.js"

rem ;; minified JS aus dem alten Verzeichnis loeschen
del %YUI_FOLDER%\%YUI_FILE_NAME%.min.js

rem ;; Hilfsdatei wieder loeschen
del %YUI_FOLDER%\merged.js

rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
rem ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

rem ;; Ausgabe, wenn alles geklappt hat
echo Die JS-Dateien wurden erfolgreich zusammengefuegt und minimiert.
echo.
echo Dateiname: %YUI_FILE_NAME%.min.js
echo Verzeichnis: %YUI_FOLDER_DEST%
echo.
echo Bitte eine Taste zum Beenden druecken.
pause>nul