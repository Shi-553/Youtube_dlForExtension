Windows

Install instructions

Set up with the .exe installer(new)

  1:Download 'Youtube_dlForExtension/windows/Youtube_dlForExtension.exe'.
    https://drive.google.com/uc?export=download&id=1dfo-8wPaAupR8OAIbekl69kFNbo1Y_JZ

  2:Open the exe and follow the stroller.
   (Please do not put it in the folder which uses non-ASCII characters or those that require special privileges.)

  3:If Firefox is running, restart.


Set up with the .zip

  1:Download 'Youtube_dlForExtension/windows/Youtube_dlForExtension.zip'.
    https://drive.google.com/uc?export=download&id=1yhHlH-xtX2XjIa7DzEq5SOOxJT14I4A4

  2:Unzip the downloaded zip.

  3:Place the folder in the directory you like.
   (Please do not put it in the folder which uses non-ASCII characters or those that require special privileges.)

    ex: "C:\Program Files" & "C:\Users\username\Downloads\ÝÝÝあああ" - No Good 
        "C:\Users\username\Documents" - OK

  4:Run 'RegistrySet.bat' as an administrator.
    (If you move the folder, run again.)

  5:If Firefox is running, restart.


Save more high-quality videos(If you do not do this, you will not be able to download videos larger than 720p on YouTube.)
  1:Download ffmpeg build.
    https://github.com/BtbN/FFmpeg-Builds/releases/latest

    "ffmpeg.........-win64-lgpl-4.3.zip"

    Make sure it's not shared.

  2:Unzip the downloaded 7z or zip.

  3:Put unzipped folder/bin/ (ffmpeg.exe and ffprobe.exe) in 'Youtube_dlForExtension' folder.


If you see a notification "The required package not installed"
  Install this.(Click on the notification to go to this page.)
  https://www.microsoft.com/en-US/download/details.aspx?id=5555


Uninstall instructions
  1:'RegistryDelete.bat' to run.

  2:Delete 'Youtube_dlForExtension' folder.


Memo
・When change download directory
  Option->Directory to download

・Popup Download button
  Main Directory  -left click
  Sub Directory  -right click
  Select Directory  -Wheel click

・Playlist download not supported

・Options->Send to Youtube-dl->

    Filename option:
      Change the default file name.

    Retrieving JSON and donwloading files option:
      Add 「-F」 when you want to select a video format.

      Add 「--add-header Accept-Language:<language>」,
      when you want to change the language,
      https://www.google.com/search?q=Accept-Language


Attention
  The default is to request the highest quality video/audio.
  Therefore, it may be an MKV file etc.
  So for example, if you want to output to MP4, you may want to add this command to an option.

  --format "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best" --merge-output-format mp4

  Because I see only the answers at the bottom of the page below,
  Can't say it is absolutely the best choice.
  https://unix.stackexchange.com/questions/272868/download-only-format-mp4-on-youtube-dl/272934

  If you have a better answer, please let me know.
    https://www.google.com/search?q=youtube-dl+mkv+to+mp4




・If it doesn't work on a particular site,
 please contact us after watching youtube-dl github Issues. 
 https://github.com/ytdl-org/youtube-dl/issues

・Setup support&Requests&Bugs, etc.
  SHiii0410223@gmail.com,
  https://github.com/Shi-553/Youtube_dlForExtension