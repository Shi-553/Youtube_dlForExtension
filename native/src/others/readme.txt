Others
I only have Windows, so I haven't been able to verify it enough.

Install instructions
  1:Download 'Youtube_dlForExtension/others/Youtube_dlForExtension.zip'.
    https://drive.google.com/uc?export=download&id=1Z2t8F5grpS4x_o54yuQMIJ01YrI16YBm?usp=sharing 

  2:Unzip the downloaded zip.

  3:Place the contents of the folder in the directory written here.
      https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests#Manifest_location

    / Specified directory / Youtube_dlForExtension.json
                          / Youtube_dlForExtension / Youtube_dlForExtension.py

  4:Install Python 3.7.4 or higher(Script made with 3.7.4)
    Set the PATH environment variable.

  5:Download Youtube-dl.
    https://ytdl-org.github.io/youtube-dl/download.html

  6:If Firefox is running, restart.


Save more high-quality videos(If you do not do this, you will not be able to download videos larger than 720p on YouTube.)
  1:Download ffmpeg build.
    https://ffmpeg.zeranoe.com/builds/.

  2:Unzip the downloaded zip.

  3:Place the folder in the directory you like.

  4:firefox Managing extensions -> Youtube-dlForExtension-> Options -> 
    Send to Youtube-dl -> Retrieving JSON and donwloading files option 

    Add「--ffmpeg-location "<your ffmpeg path>"」

    Reference
    https://github.com/ytdl-org/youtube-dl/blob/master/README.md#post-processing-options



Uninstall instructions
  1:Delete 'Youtube_dlForExtension' folder.



Memo
・When change download directory
  Option->Directory to download

・Popup Download button
  Main Directory  -left click
  Sub Directory  -right click
  Select Directory  -Wheel click

・Playlist download not supported

・Options- > Send to Youtube-dl ->

    Filename option:
      Change the default file name.

    Retrieving JSON and donwloading files option:
      Add 「-F」 when you want to select a video format.

      Add 「--add-header Accept-Language:<language>」,
      when you want to change the language,

      Reference
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