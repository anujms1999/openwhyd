TITLE="Number of plays per day"
NAME=plot-nb-plays-per-day

# DB=openwhyd_dump
# FIELDS=_id,value.total,value.yt,value.sc,value.dm,value.vi,value.dz,value.ja,value.bc,value.fi,value.sp
COLUMNS="Date,Total plays,Youtube,SoundCloud,Dailymotion,Vimeo,Deezer,Jamendo,Bandcamp,Audio file,Spotify"
# from https://github.com/openwhyd/openwhyd/blob/d27fb71220cbd29e9e418bd767426e3b4a2187f3/whydJS/public/js/whydPlayer.js#L559
NB_COLUMNS=`echo $COLUMNS | sed 's/[^,]//g' | wc -c` # count COLUMNS

echo "map-reducing data from playlog ... (⚠️  may take several minutes)"
SECONDS=0
# mongo --quiet $DB ./$NAME.mongo.js
node json-helpers/run-mongo-script-from-json-dump.js $NAME.mongo.js ../playlog.json.log >../logs/$NAME.temp.json
echo ⏲  $SECONDS seconds.
# write resulting collection into output csv file, with custom header row
# echo $COLUMNS >$NAME.temp.csv
# mongoexport -d $DB -c "$NAME" --type=csv --fields "$FIELDS" | tail -n+2 >>$NAME.temp.csv
# sed -i '' -e '$ d' $NAME.temp.csv # remove last line

echo "convert data to csv ..."
node convert-json-to-csv.js ../logs/$NAME.temp.json >../logs/$NAME.temp.csv
# rename csv headers
sed -i '' 's/_id/Date/; s/value.//g; s/total/Total plays/g; s/yt/Youtube/g; s/sc/Soundcloud/g; s/dm/Dailymotion/g; s/vi/Vimeo/g; s/dz/Deezer/g; s/ja/Jamendo/g; s/bc/Bandcamp/g; s/fi/Audio file/g; s/sp/Spotify/g' ../logs/$NAME.temp.csv

echo "plot data to ../plots/$NAME.png ..."
mkdir ../plots &>/dev/null
gnuplot -c plot-csv-data.gp ../logs/$NAME.temp.csv $NB_COLUMNS "$TITLE" >../plots/$NAME.png

echo "open ../plots/$NAME.png ..."
open ../plots/$NAME.png
# rm $NAME.temp.csv
