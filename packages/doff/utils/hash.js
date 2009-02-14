var ANTABLE  = "w5Q2KkFts3deLIPg8Nynu_JAUBZ9YxmH1XW47oDpa6lcjMRfi0CrhbGSOTvqzEV";

function hash(str) {
    var h = 0;
    if (isnumber(str)) return str;
    if (str) {
        for (var j = str.length-1; j >= 0; j--) {
            h ^= ANTABLE.indexOf(str.charAt(j)) + 1;
            for (var i=0; i<3; i++) {
                var m = (h = h << 7 | h >>> 25) & 150994944;
                h ^= m ? (m == 150994944 ? 1 : 0) : 1;
            }
        }
    }
    return h;
}

$P({'hash': hash});