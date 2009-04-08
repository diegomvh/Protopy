function WoopraTracker(){

        var pntr=false;
        var chat=false;

        var idle=false;
        var idle_timeout=20*1000;
        var last_action=false;
        var timeout=timeout=30*60*1000;

        var wx_static=false;
        var wx_engine=false;

        var visitor_data=false;
        var event_data=false;

        this.initialize=function(){

            pntr=this;
            last_action=new Date()

            visitor_data=new Array();
            event_data=new Array();

	    if(!this.readcookie('wooTracker')){
                this.createcookie('wooTracker', this.randomstring(), 10*1000);
            }
            if(!this.readcookie('sessionCookie')){
                this.createcookie('sessionCookie', this.randomstring(), -1);
            }

            if(document.location.protocol=="https:"){
                wx_static="https://sec1.woopra.com";
                wx_engine="https://sec1.woopra.com";
            }else{
                wx_static="http://static.woopra.com";
                wx_engine='http://'+((location.hostname.indexOf('www.')<0)?location.hostname:location.hostname.substring(4))+'.woopra-ns.com';
            }
            //
            if(document.addEventListener){
                document.addEventListener("mousedown",this.clicked,false);
                document.addEventListener("mousemove",this.moved,false);
            }
            else{
                document.attachEvent("onmousedown",this.clicked);
                document.attachEvent("onmousemove",this.moved);
            }
        }

        this.setVisitorData=function(k,v){
            visitor_data[k]=v;
        }

        this.setEventData=function(k,v){
            event_data[k]=v;
        }

        this.getStatic=function(){
            return wx_static;
        }
        this.getEngine=function(){
            return wx_engine;
        }
	this.setEngine=function(e){
	    wx_engine=e;
	}

        this.sleep=function(millis){
            var date = new Date();
            var curDate = new Date();
            while(curDate-date < millis){
                curDate=new Date();
            }
        }

        this.randomstring=function(){
            var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var s = '';
            for (i = 0; i < 32; i++) {
                var rnum = Math.floor(Math.random() * chars.length);
                s += chars.substring(rnum, rnum + 1);
            }
            return s;
        }

        this.getnavigatortoken=function(){
            if(window.opera || window.Opera){
                return 'O';
            }
            if(navigator.userAgent){
                return 'U';
            }
            return "X";
        }

        this.getlantoken=function(){
            return (navigator.browserLanguage || navigator.language || "");
        }

           this.readcookie=function(k) {
        var c=""+document.cookie;
        var ind=c.indexOf(k);
        if (ind==-1 || k==""){
            return "";
        }
        var ind1=c.indexOf(';',ind);
        if (ind1==-1){
            ind1=c.length;
        }
        return unescape(c.substring(ind+k.length+1,ind1));
    }
    this.createcookie=function(k,v,days){
        var exp='';
        if(days>0){
            var expires = new Date();
            expires.setDate(expires.getDate() + days);
            exp = expires.toGMTString();
        }
        cookieval = k + '=' + v + '; ' + ((exp)?('expires=' + exp + ' ;'):'') + 'path=/';
        document.cookie = cookieval;
    }

        this.request=function(url){
            var script=document.createElement('script');
            script.type="text/javascript";
            script.src = url;
            document.getElementsByTagName('head')[0].appendChild(script);
        }

        this.sendEvent=function(typ, val){
            var _mod = ((document.location.protocol=="https:")?'/woopras/customevent.jsp?':'/customevent/');
            var _url= wx_engine + _mod +'cookie=' + this.readcookie('wooTracker') + '&type=' + typ+ '&name='+ val + '&ra='+this.randomstring();
            this.request(_url);
        }

        this.track=function(){

            var date=new Date();

            var woopra_request=new Array();

            woopra_request['sessioncookie']=this.readcookie('sessionCookie');
            woopra_request['cookie']=this.readcookie('wooTracker');
            woopra_request['browsertoken']=this.getnavigatortoken();
            woopra_request['platformtoken']=navigator.platform;
            woopra_request['language']=this.getlantoken();
            woopra_request['pagetitle']=document.title;
            woopra_request['referer']=document.referrer;
            woopra_request['screen']=screen.width + 'x' + screen.height;
            woopra_request['localtime']=date.getHours()+':'+date.getMinutes();


            var _k=false;

            for (_k in visitor_data){
                if(typeof visitor_data[_k]!='function'){
                    woopra_request['cv_'+_k]=visitor_data[_k];
                }
            }

            for (_k in event_data){
                if(typeof event_data[_k]!='function'){
                    woopra_request['ev_'+_k]=event_data[_k];
                }
            }


            var req_url="";
            for (_k in woopra_request){
                if(typeof woopra_request[_k]!='function'){
                    req_url+="&"+_k+"="+encodeURIComponent(woopra_request[_k]);
                }
            }

            var _mod = ((document.location.protocol=="https:")?'/woopras/visit.jsp?':'/visit/');
            this.request(wx_engine + _mod +'ra='+this.randomstring()+req_url);
        }


        this.ping=function(){
            if(new Date()-last_action> timeout){
                return;
            }
            var _mod = ((document.location.protocol=="https:")?'/woopras/ping.jsp?':'/ping/');
            var _url = wx_engine + _mod + 'cookie='+this.readcookie('wooTracker')+'&ra='+this.randomstring();
            this.request(_url);
        }

        this.clicked=function(e) {

            var cElem = (e.srcElement) ? e.srcElement : e.target;
            if(cElem.tagName == "A"){
                var link=cElem;
                var _download = link.pathname.match(/(?:doc|eps|jpg|png|svg|xls|ppt|pdf|xls|zip|txt|vsd|vxd|js|css|rar|exe|wma|mov|avi|wmv|mp3)($|\&)/);
                if(_download){
                    pntr.sendEvent("download",link.href);
                    pntr.sleep(100);
                }
                if (!_download&&link.hostname != location.host && link.hostname.indexOf('javascript')==-1 && link.hostname!=''){
                    pntr.sendEvent("exit",link.href);
                    pntr.sleep(400);
                }
            }
        }

        this.moved=function(e) {
            last_action=new Date();
            if(idle==1){
                idle=0;
                this.woopra_event("status","0");
            }
        }

        this.checkidle=function(){
            if(idle==0 && (new Date()-last_action)> idle_timeout){
                idle=1;
                this.woopra_event("status","1");
            }
            setTimeout(function(){pntr.checkidle();},5 * 1000);
        }


        this.startConversation=function(imsg){
            if(!chat){
		chat='loading';
		var script=document.createElement('script');
		script.type='text/javascript';
		script.src=wx_static+'/js/woopra-chat.js'+'?a='+Math.random();
		document.getElementsByTagName('head')[0].appendChild(script);
		
		    script.onload=function(){
                	chat=new WoopraChat();
                	chat.load(pntr,imsg);
                	chat.showNotification();
		    }
		    script.onreadystatechange = function() {
  			if (this.readyState == 'complete'|| this.readyState=='loaded') {
   			 	chat=new WoopraChat();
                        	chat.load(pntr,imsg);
                        	chat.showNotification();
   			}
   		    }
		}
        }

        this.showConversation=function(){
            var url='http://analytics.woopra.com/yui/chatframe.jsp?cookie='+pntr.readcookie('wooTracker')+'&host='+window.location.host+"&ra="+pntr.randomstring();
            var newwindow=window.open(url,'name','height=400,width=350,resizable=1,statusbar=0,location=0,scrollbars=0,toolbar=0,directories=0,menubar=0');
            if (!newwindow.opener) {
                newwindow.opener = self;
            }
            if (window.focus) {
                newwindow.focus()
            }
        }

    }

 var woopraTracker=new WoopraTracker();
    woopraTracker.initialize();


    {
        if(typeof woopra_array!='undefined'){
            for (var woo_key in woopra_array){
                if(typeof woopra_array[woo_key]!='function'){
                    woopraTracker.setVisitorData(woo_key,woopra_array[woo_key]);
                }
            }
        }
        if(typeof woopra_visitor!='undefined'){
            for (var woo_key in woopra_visitor){
                if(typeof woopra_visitor[woo_key]!='function'){
                    woopraTracker.setVisitorData(woo_key,woopra_visitor[woo_key]);
                }
            }
        }
        if(typeof woopra_event!='undefined'){
            for (var woo_key in woopra_event){
                if(typeof woopra_event[woo_key]!='function'){
                    woopraTracker.setEventData(woo_key,woopra_event[woo_key]);
                }
            }
        }
    }

    woopraTracker.track();

    setTimeout(function(){woopraTracker.ping();},10*1000);


