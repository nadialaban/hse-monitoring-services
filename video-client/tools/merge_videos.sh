ffmpeg -avoid_negative_ts 1  -f concat -i mylist.txt -c copy finalvideo.webm

ffmpeg -i patient_room_1_1670709506479.webp -i doctor_room_1_1670709506479.webp \
-filter_complex "[0:v][1:v]scale2ref='oh*mdar':'if(lt(main_h,ih),ih,main_h)'[0s][1s];[1s][0s]scale2ref='oh*mdar':'if(lt(main_h,ih),ih,main_h)'[1s][0s];[0s][1s]hstack,setsar=1[v];[0:a][1:a]amerge=inputs=2[a]" \
-map "[v]" -map "[a]" -ac 2 \
 output.webm
