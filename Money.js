var scrW;
var scrH;
var dragStart={};
var db=null;
var accounts=[]; 
var accountNames=[];
var account=null;
var acIndex=null;
var logData=null;
var logs=[]; // replaces transactions
var log=null;
var txIndex; // index of current transaction in logs[]
var tx=null;
var balance=0;
var grandTotal=0;
var totals=[];
var list=[];
var currentDialog=null;
var view='list';
var canvas=null;
var today;
var latest;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";
// solid session & authentication...
const auth=solidClientAuthentication;
const session=auth.getDefaultSession();
// DRAG LEFT/RIGHT ACTIONS
id('main').addEventListener('touchstart', function(event) {
    // console.log(event.changedTouches.length+" touches");
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    // console.log('start drag at '+dragStart.x+','+dragStart.y);
})
id('main').addEventListener('touchend', function(event) {
    var dragX=event.changedTouches[0].clientX-dragStart.x;
    if(view=='list') { // list view
    	if(account && dragX>50) { // drag right to decrease depth...
        	console.log("BACK");
	    	account=null;
	    	toggleDialog('txDialog',false);
	    	listAccounts();
    	}
    	else if(dragX<-50) { // drag left
    	// console.log('DRAG LEFT');
    		/*
    		if(currentDialog) toggleDialog(currentDialog,false); // close an open dialog or...
    		else 
    		*/
    		if(account) { // ...switch to account graph view
    			view='graph';
    			id('listPanel').style.display='none';
    			id('buttonNew').style.display='none';
    			drawGraph();
    		}
    		else { // draw graph of monthly totals
    			view='totals';
    			id('listPanel').style.display='none';
    			id('buttonNew').style.display='none';
    			id('header').style.display='none';
    			drawTotals();
    		}
    	}
    }
    else { // graph view
    	if(dragX>50) { // drag right to return to list view
    		view='list';
    		id('graphPanel').style.display='none';
    		id('graphOverlay').style.display='none';
    		id('listPanel').style.display='block';
    		id('header').style.display='block';
    		id('buttonNew').style.display='block';
    	}
    }
})
// TAP HEADER - DATA MENU
id('header').addEventListener('click',function() {
	upload();
	/*
	if(account) return;
	toggleDialog('dataDialog',true); // ..backup/restore data
	*/
})
// NEW BUTTON: create new account or transaction
id('buttonNew').addEventListener('click',function() {
	console.log("new");
	var d=new Date().toISOString();
    if(!account) { // no account open - show new account dialog
		console.log("new account");
		toggleDialog('newAccountDialog',true);
		id('newAccountNameField').value="";
		id('newAccountDateField').value=d.substr(0,10);
		id('newAccountDateField').disabled=false;
		id("newAccountBalanceField").value=null;
		id('newAccountBalanceField').placeholder="£.pp";
	}
	else { // if viewing account, show new transaction dialog
		toggleDialog('txDialog',true);
		console.log("new transaction in "+account.name+" account");
		txIndex=null;
		tx={};
		tx.checked=false;
		var n=0;
		while(id('txAccountChooser').options[n].text!=account.name) n++;
		console.log("account #"+n);
		id('txAccountChooser').selectedIndex=n;
		id('txAccountChooser').disabled=false;
		id('txDateField').value=d.substr(0,10);
		id('txDateField').disabled=false;
		id('txSign').innerHTML='-';
		id('txAmountField').value=null;
		id('txAmountField').placeholder="£.pp";
		console.log("set text to blank");
		// OLD id('txTextField').value=(investment)?"current value":"";
		id('txTextField').value="";
		// OLD id('txTextField').disabled=(investment)?true:false; // standard text 'gain' for investment accounts
		id('txTransferChooser').selectedIndex=0;
		id('txMonthly').checked=false;
		// OLD id('txMonthly').disabled=(investment)?true:false; // cannot have monthly investment gains
		id('txBalance').style.color='gray';
		id("buttonDeleteTx").style.display='none';
		id('buttonAddTx').style.display='block';
		id('buttonSaveTx').style.display='none';
	}
})
// CYCLE AMOUNT SIGN -/+/=
id('txSign').addEventListener('click', function() {
	var s=id('txSign').innerHTML;
	console.log("toggle sign - currently "+s);
	if(s=='+') id('txSign').innerHTML="=";
  	else if(s=='=') id('txSign').innerHTML="-";
	else id('txSign').innerHTML="+";
})
// SAVE NEW ACCOUNT
id('buttonAddNewAccount').addEventListener('click',function() {
	var name=id('newAccountNameField').value.trim(); // remove whitespace
	if((name.length>0)&&(accounts.indexOf(name)<0)) {
		var amount=Math.round(id('newAccountBalanceField').value*100); // save amounts and balances as pence
		if(id('acSign').innerHTML=="-") amount*=-1;
		var ac={name: name, balance: amount};
		console.log("new account name: "+ac.name+"; amount: "+ac.balance+" pence");
	  	accounts.push(ac);
		var tx={};
		tx.date=id('newAccountDateField').value;
		tx.account=name;
		tx.amount=amount;
		tx.text="B/F";
		tx.checked=false;
		tx.transfer="none";
		// OLD if(id('newAccountInvestmentFlag').checked) tx.transfer="investment";
		tx.monthly=false;
		logs.push(tx);
		toggleDialog('newAccountDialog', false);
		listAccounts();
	  }
})
// CHANGE TRANSACTION DATE
id('txDateField').addEventListener('change', function() {
	console.log("change date");
})
// SAVE NEW TRANSACTION
id('buttonAddTx').addEventListener('click',function() {
	saveTx(true);
})
// SAVE EDITED TRANSACTION
id('buttonSaveTx').addEventListener('click',function() {
	saveTx(false);
})
// ADD/SAVE TRANSACTION
function saveTx(adding) {
	tx.account=accountNames[id('txAccountChooser').selectedIndex];
	var i=id('txTransferChooser').selectedIndex;
	console.log('transfer choice: '+i);
	tx.transfer=id('txTransferChooser').options[i].text;
	console.log('transfer to '+tx.transfer);
	tx.date=id('txDateField').value;
	tx.amount=Math.round(id('txAmountField').value*100);
	if(id('txSign').innerHTML=="-") tx.amount*=-1;
	tx.text=id('txTextField').value;
	tx.monthly=id('txMonthly').checked;
    toggleDialog('txDialog',false);
    console.log("save transaction - date: "+tx.date+" "+tx.amount+"p - "+tx.text+" txIndex: "+txIndex);
	if(adding) { // add new transaction
		if(id('txSign').innerHTML=="=") {
			tx.text='...';
			tx.amount-=balance; // deduct previous account balance from new balance to find amount added/debited
		}
		var earliest=logs[0].date; // date of earliest transaction in account
		console.log("add new transaction date "+tx.date+" - oldest is "+earliest);
		if(tx.date<earliest) alert("TOO EARLY");
		else { // add new transaction to indexedDB
			logs.push(tx);
			console.log("transaction added");
		}
	}
	else { // update existing transaction
		logs[txIndex]=tx;
		console.log('transaction updated');
	}
	if(tx.transfer!='none'){ // create reciprocal transaction?
		console.log("create reciprocal transaction");
		var t={};
		t.account=tx.transfer;
		t.checked=false;
		t.date=tx.date;
		t.amount=-1*tx.amount;
		t.text=tx.account;
		t.transfer="none";
		t.monthly=false;
		logs.push(t);
		console.log("reciprocal transaction added in "+tx.transfer+" account");
	}
	logs.sort(function(a,b) {return Date.parse(a.date)-Date.parse(b.date)}); // chronological order
	save();
	listTransactions();
}
// DELETE TRANSACTION
id('buttonDeleteTx').addEventListener('click', function() {
	var text=tx.text;
	console.log("delete transaction "+txIndex+': '+text);
	logs.splice(txIndex,1);
	toggleDialog("txDialog",false);
	save(); // writeData(); WAS saveLogs();
	listTransactions();
});
// CLOSE DIALOG
id('curtain').addEventListener('click',function() {
	toggleDialog(currentDialog,false);
})
// SHOW/HIDE DIALOGS
function toggleDialog(d,visible) {
	if(visible) {
		if(currentDialog) id(currentDialog).style.display='none';
		id(d).style.display='block';
		currentDialog=d;
		id('buttonNew').style.display='none';
		id('curtain').style.height='100%';
	}
	else{
		id(d).style.display='none';
		currentDialog=null;
		id('buttonNew').style.display='block';
		id('curtain').style.height='0';
	}
}
// OPEN SELECTED TRANSACTION FOR EDITING
function openTx(n) {
	console.log('open transaction '+n);
	txIndex=list[n];
	console.log('log index is '+txIndex);
	tx=logs[txIndex];
	console.log("transaction date: "+tx.date);
	console.log("open transaction: "+txIndex+"; "+tx.text);
	toggleDialog('txDialog',true);
	id('txAccountChooser').selectedIndex=accountNames.indexOf(tx.account);
	id('txDateField').value=tx.date.substr(0,10);
	id('txAmountField').value=pp(tx.amount);
	id('txTextField').value=tx.text;
	id('txBalance').innerHTML=pp(tx.balance);
	id('txBalance').style.color=(tx.balance<0)?'yellow':'white';
	id('buttonDeleteTx').style.display='block';
	id('buttonAddTx').style.display='none';
	id('buttonSaveTx').style.display='block';
	var i=id('txTransferChooser').options.length-1;
	while((i>0)&&(id('txTransferChooser').options[i].text!=tx.transfer)) i--;
	id('txTransferChooser').selectedIndex=i;
	id('txMonthly').checked=tx.monthly;
	id('buttonDeleteTx').disabled=false;
	id('txSign').innerHTML=(tx.amount<0)?"-":"+";
	if(tx.text=='...') id('txSign').innerHTML='=';
	else {
		id('txTextField').value=tx.text;
		id('txTextField').disabled=false;
	}
	if(tx.text=="B/F") { // can only change date or amount of earliest B/F item
		var n=logs.length;
		console.log("limit edits txIndex:"+txIndex+" "+n+" items");
		id('txAccountChooser').disabled=true;
		id('txTextField').disabled=true;
		id('txTransferChooser').disabled=true;
		id('txMonthly').disabled=true;
		if((n>1)&&(txIndex<1)) { // can only delete B/F if it is only transaction - effectively deletes account
		    id('buttonDeleteTx').disabled=true;
		}
	}
	else {
		console.log("full editing");
		id('txAccountChooser').disabled=false;
		id('txDateField').disabled=false;
		id('txTextField').disabled=false;
		id('txTransferChooser').disabled=false;
		id('txMonthly').disabled=false;
		id('buttonDeleteTx').disabled=false;
	}
}
// LIST ACCOUNTS
function listAccounts() {
	console.log("list "+accounts.length+" accounts");
  	var item = null;
	id('list').innerHTML="";
	var html="SolidMoney";
	if(accounts.length>0) {
	    accounts.sort(function(a,b) { return (a.name>b.name)?1:-1}); //alpha-sort on account names
		console.log("accounts sorted - first: "+accounts[0].name);
		while(id('txAccountChooser').options.length>0)  id('txAccountChooser').options.remove(0);  // clear account lists
		while(id('txTransferChooser').options.length>0)  id('txTransferChooser').options.remove(0);
		accountNames=[];
		grandTotal=0;
		var ac=document.createElement('option');
		ac.text="none";
		ac.index=0;
		id('txTransferChooser').options.add(ac);
		for(var i in accounts) {
			console.log('list '+accounts[i].name);
		    accountNames.push(accounts[i].name);
			grandTotal+=parseInt(accounts[i].balance);
			var listItem=document.createElement('li'); // add account to accounts list...
			listItem.index=i;
	  		listItem.classList.add('list-item');
			html="<b>"+trim(accounts[i].name,20)+"</b>";
			if(accounts[i].balance<0) html+="<span class='amount-debit'>";
			else html+="<span class='amount'>";
			html+=pp(accounts[i].balance)+"</span>";
			listItem.innerHTML=html;
			listItem.addEventListener('click', function(){acIndex=this.index; openAccount();});
			id('list').appendChild(listItem);
			ac=document.createElement('option'); // ...and to account chooser...
			ac.index=i;
			ac.text=accounts[i].name;
			id('txAccountChooser').options.add(ac);
			ac=document.createElement('option'); // ...and transfer chooser
			ac.index=i+1;
			ac.text=accounts[i].name;
			id('txTransferChooser').options.add(ac);
	  	}
	  	console.log("transfer option 0: "+id('txTransferChooser').options[0].text);
		html="SolidMoney <span class='amount'>"+pp(grandTotal)+"</span>";
		today=new Date();
		var month=today.getMonth()+1;
		console.log('save total '+grandTotal+' for month '+month);
		totals[month]=grandTotal; // update grand total for this month
		window.localStorage.setItem('totals',JSON.stringify(totals));
		console.log('save totals... '+totals);
	}
	id('headerTitle').innerHTML=html;
	id('listPanel').scrollIntoView();
}
// OPEN ACCOUNT
function openAccount() {
    account=accounts[acIndex];
	console.log("open account #"+acIndex+": "+account.name);
	listTransactions();
}
// LIST ACCOUNT TRANSACTIONS
function listTransactions() {
	list=[];
	for(var i=0;i<logs.length;i++) { // build list of indeces of account logs
		if(logs[i].account==account.name) {
			console.log('add log '+i+': '+logs[i].text+'; '+logs[i].amount+'; transfer: '+logs[i].transfer);
			list.push(i);
		}
	}
	if(list.length>50) { // limit list to 50 transactions
		console.log(logs.length+' logs; '+list.length+" items ie. >50 transactions - delete earliest");
		if(logs[list[0]].text!='gain') {
			var earliest=list[0];
			console.log('earliest is '+earliest+'; next is '+list[1]);
			logs[list[1]].amount+=logs[list[0]].amount; // create new B/F item for account
			logs[list[1]].text="B/F";
			logs[list[1]].monthly=false;
			console.log('earliest transaction now '+list[1]+': '+logs[list[1]].text+' '+logs[list[1]].amount);
		}
		console.log('delete log '+earliest+': '+logs[earliest].amount);
		list.shift(); // remove first transaction from list
		logs.splice(earliest,1); // ...and delete what was earliest log...
		console.log('list of '+list.length+' now starts with '+logs[list[0]].text);
		// console.log(' and ends with '+logs[list[list.length-1]].text);
		save(); // writeData(); WAS saveLogs();
		listTransactions(); // recursion
	}
	var item=null;
	id('list').innerHTML="";
	var html="";
	var tx={};
	var d="";
	var mon=0;
	balance=0;
	console.log("list "+list.length+" transactions - earliest is "+list[0]+' £'+logs[list[0]].amount);
	for(var i in list) {
		console.log('check transaction '+i+': '+logs[list[i]].text);
		balance+=logs[list[i]].amount;
		logs[list[i]].balance=balance;
	}
	for(i=list.length-1;i>=0;i--) { // list in reverse order
		var listItem=document.createElement('li');
		listItem.index=i;
		listItem.classList.add('list-item');
		tx=logs[list[i]];
		var itemCheck=document.createElement('input');
		itemCheck.setAttribute('type','checkbox');
		itemCheck.setAttribute('class','check');
		itemCheck.index=i;
		itemCheck.checked=tx.checked;
		itemCheck.addEventListener('change',function() { // toggle.checked property
			tx=logs[list[this.index]];
			tx.checked=!tx.checked;
			console.log("checked is "+tx.checked);
			logs[list[this.index]]=tx;
			// saveTx(false);
			save();
		});
		listItem.appendChild(itemCheck);
		var itemText=document.createElement('span');
		itemText.style='margin-right:50px;';
		itemText.index=i;
		d=tx.date;
		mon=parseInt(d.substr(5,2))-1;
		mon*=3;
		d=d.substr(8,2)+" "+months.substr(mon,3); // +" "+d.substr(2,2);
		html="<span class='date'>"+d+"</span><span class='comment'>"+trim(tx.text,15)+"</span>";
		var a=tx.amount;
		if(a<0) html+="<span class='amount-debit'>";
		else html+="<span class='amount'>";
		html+=pp(a);
		itemText.innerHTML=html;
		itemText.addEventListener('click', function(){openTx(this.index);});
		listItem.appendChild(itemText);
		id('list').appendChild(listItem);
	}
	id('txSign').innerHTML='-'; // default to debit
	accounts[acIndex].balance=balance;
	html=trim(account.name,15)+"<span class='amount'>";
	if(balance<0) html+="-";
	html+=pp(balance)+"</span>";
	id('headerTitle').innerHTML=html;
	id('listPanel').scrollIntoView();
}
// DRAW ACCOUNT GRAPH
function drawGraph() {
	console.log('ACCOUNT GRAPH');
	var firstDay=day(logs[list[0]].date); // whole days
	var lastDay=day(logs[list[list.length-1]].date);
	var n=lastDay-firstDay;
	var dayW=scrW/n; // pixels/day
	console.log('graph spans '+n+' days from '+firstDay+' to '+lastDay+' dayW: '+dayW);
	console.log('screen width: '+scrW+'; '+list.length+' transactions'); // canvasL is '+canvasL+'; width is '+id('canvas').width);
	id('graphPanel').style.display='block';
	// draw graph of balance against days/transactions
	var h=scrH/12;
	canvas.clearRect(0,0,scrW,scrH);
	canvas.strokeStyle='yellow';
	canvas.lineJoin='round';
	canvas.lineWidth=3;
	canvas.beginPath();
	for(i=0;i<list.length;i++) {
		var val=logs[list[i]].balance/5000000;
		var x=(day(logs[list[i]].date)-firstDay)*dayW;
		var y=scrH-3*h-val*h;
		console.log('balance: '+val+'point '+i+': '+x+','+y);
		if(i<1) canvas.moveTo(x,y);
		else canvas.lineTo(x,y);
	}
    canvas.stroke();
    // draw £ scale
    canvas.font='20px Monospace';
    canvas.fillStyle='white';
    canvas.textAlign='left';
	canvas.strokeStyle='white';
	canvas.lineWidth=1;
	canvas.beginPath();
	for(i=1;i<12;i++) {
		canvas.moveTo(0,i*h);
		canvas.lineTo(scrW,i*h);
	}
	canvas.stroke();
	for(i=-2;i<10;i++) canvas.fillText((i*50)+'k',5,scrH-3*h-i*h-2);
}
//  TOTALS GRAPH
function drawTotals() {
	console.log('TOTALS GRAPH');
	id('graphPanel').style.display='block';
	canvas.clearRect(0,0,scrW,scrH);
	canvas.fillStyle='silver';
	canvas.strokeStyle='white';
	canvas.font='20px Monospace';
	canvas.textAlign='left';
	var w=scrW/12;
	var h=scrH/12;
	today=new Date();
	var offset=10-today.getMonth(); // latest month is at right of screen
	for(var i=1;i<13;i++) {
		console.log('total '+i+': '+totals[i]);
		var x=(i+offset)%12*w;
		var y=totals[i]/10000000*h; // pence to multiples of £100k
		console.log('bar height: '+y+' at '+x);
		canvas.fillRect(x,11*h,w,-y);
	}
	canvas.lineWidth=1;
	canvas.beginPath();
	for(i=1;i<11;i++) {
		canvas.moveTo(0,i*h);
		canvas.lineTo(scrW,i*h);
	}
	canvas.stroke();
	/*
	canvas.beginPath();
	canvas.strokeStyle='silver'; // current grand grandTotal
	y=11*h-grandTotal/10000000*h;
	console.log('grandTotal: '+grandTotal+'; y: '+y);
	canvas.moveTo(0,y);
	canvas.lineTo(scrW,y);
	canvas.stroke();
	*/
	canvas.fillStyle='white';
	for(i=1;i<13;i++) canvas.fillText((i*100)+'k',5,scrH-i*h-h-2);
	var d=11-new Date().getMonth();
	for(i=0;i<12;i++) canvas.fillText(months.substr(i*3,1),(((i+d)%12)*w)+10,36);
}
// DATA
function load() {
	var data=localStorage.getItem('MoneyData');
	if(!data) {
		id('dataMessage').innerText='No data - restore backup?';
		id('backupButton').disabled=true;
		toggleDialog('dataDialog',true);
		return;
	}
	logs=JSON.parse(data);
	logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); //chronological order
	// build accounts array
   	accounts=[];
	var acNames=[];
    var n=0;
    for(var i in logs) { // build list of accounts
		var today=new Date();
		var month=today.getFullYear()*12+today.getMonth()+1; // months count
    	today=today.getDate();
    	if(logs[i].monthly) { // deal with monthly repeats
    		console.log("monthly repeat check");
			var transfer=false;
    		var txDate=logs[i].date; // YYYY-MM-DD
    		var txMonth=parseInt(txDate.substr(0,4))*12+parseInt(txDate.substr(5,2)); // months count
    		var txDay=txDate.substr(8,2);
    		if((((month-txMonth)>1))||(((month-txMonth)==1)&&(today>=txDay))) { // one month or more later
    			console.log(">> add repeat transaction for "+logs[i].text);
				logs[i].monthly=false; // cancel monthly repeat
    			var tx={}; // create repeat transaction
    			tx.account=logs[i].account;
    			console.log('repeat tx account: '+tx.account);
    			txMonth+=1; // next month (could be next year too)
    			tx.date=Math.floor(txMonth/12).toString()+"-";
				txMonth%=12;
    			if(txMonth<10) tx.date+='0'; // isoDate+="0";
    			tx.date+=txMonth.toString()+"-"+txDay;
    			console.log('repeat tx date: '+tx.date);
    			console.log("monthly transaction date: "+txDate+"; repeat: "+tx.date);
    			tx.amount=logs[i].amount;
    			tx.checked=false;
				tx.text=logs[i].text;
				tx.transfer=logs[i].transfer;
    			var transferTX={};
    			if(tx.transfer!="none") {
    				transfer=true;
    				transferTX.account=tx.transfer;
    				transferTX.checked=false;
					transferTX.date=tx.date;
					transferTX.amount=-1*tx.amount;
    				transferTX.text=tx.account;
    				transferTX.monthly=false;
    			}
    			tx.monthly=true;
    			logs.push(tx);
			}
			if(transfer) { // IF MONTHLY TRANSACTION IS TRANSFER CREATE RECIPROCAL TRANSACTION
				logs.push(transferTX);
			}
    	}  // END OF REPEAT TRANSACTION CODE
    	if(logs[i].account==null) continue; // skip if null account
    	n=acNames.indexOf(logs[i].account);
		if(n<0) {
	  		console.log("add account "+logs[i].account);
	  		acNames.push(logs[i].account);
	  		accounts.push({name: logs[i].account, balance: logs[i].amount});
	  	}
	  	else {
	  		if(logs[i].text=='gain') accounts[n].balance=logs[i].amount;
			else accounts[n].balance+=logs[i].amount;
	  	}
    }
  	console.log(accounts.length+" accounts");
	listAccounts();
	today=Math.floor(new Date().getTime()/86400000);
	var days=today-backupDay;
	if(days>4) { // backup reminder every 5 days
		id('dataMessage').innerText=days+' days since last backup';
		id('restoreButton').disabled=true;
		toggleDialog('dataDialog',true);
	}
}
function save() {
	var json=JSON.stringify(logs);
	window.localStorage.setItem('MoneyData',json);
	window.localStorage.setItem('latest',new Date().toString());
}
// SOLID CODE
function connect() {
	message('CONNECT - logging in');
	try {
		auth.login({
    		oidcIssuer:"https://privatedatapod.com",
    		redirectUrl:window.location.href,
    		clientName:"SolidLocker"
    	});
	}
	catch(error) {console.error(error.message);}
}
auth.handleIncomingRedirect({restorePreviousSession:true}).then(function(){
	if(session.info.isLoggedIn) {
		console.log('logged in as '+session.info.webId);
		message('LOGGED IN',false);
    	sync();
	}
});
async function sync() {
	if(!session.info.isLoggedIn) {connect(); return;} // ensure connected
	latest=window.localStorage.getItem('latest');
	console.log('latest is '+latest);
	message('SYNC - DOWNLOAD?',true);
	var response=await session.fetch('https://elvinibbotson.privatedatapod.com/drive/SolidMoneyData.json',
	{ // ONLY RESTORE DATA FROM POD IF NEWER THAN CURRENT LOCAL DATA
		method: 'GET',
		headers: {'If-Modified-Since':latest}
	});
	console.log('response: '+response.json);
	if(response.ok) {
		var body=await response.json();
		console.log('response - last modified: '+response.lastModified);
		logs=body.logs;
		console.log(logs.length+" logs loaded");
    	if(json.totals) totals=json.totals
		console.log('totals: '+totals);
		save();
		message(logs.length+' logs downloaded',false);
	}
	else { // local data is newer - upload to pod
		message('|no download - UPLOAD',false);
		upload();
	}
	latest=new Date().toString();
	window.localStorage.setItem('latest',latest);
	console.log('latest set to '+latest);
	load(); // ensure working with latest dataset
}
async function upload() {
	if(!session.info.isLoggedIn) {connect(); return;} // ensure connected
  	console.log("UPLOAD",false);
	var fileName="drive/SolidMoneyData.json";
	console.log(logs.length+" logs - save");
	var data={'logs':logs,'totals':totals};
  	var json=JSON.stringify(data);
	try {
		response=await session.fetch('https://elvinibbotson.privatedatapod.com/'+fileName,{
			method:'PUT',
			headers:{'Content-Type':'application/json'},
			body:json
		});
		if(!response.ok) {
    		throw new Error(`Response status: ${response.status}`);
    	}
    	console.log('data saved, status: '+response.status);
    	message(logs.length+' logs uploaded');
	}
	catch(error) {console.error(error.message);alert(error.message);}
}
// DISPLAY MESSAGE
function message(text,clear) {
	console.log(text);
	if(clear) id('message').innerText=text;
	else id('message').innerText+='\n'+text;
	toggleDialog('messageDialog',true);
}
// UTILITIES
function id(el) {
	return document.getElementById(el);
}
function pp(p) { // convert pence to pounds.pence (2 decimals)
	p=Math.abs(p);
	var amount=Math.floor(p/100)+".";
	var pence=p%100;
	if(pence<10) amount+="0";
	amount+=pence;
	return amount;
}
function trim(text,len) { // trime text to len characters
	if(text.length>len) text=text.substr(0,len-3)+"...";
	return text;
}
function day(d) { // get day number from date d
	// console.log('day number for '+d);
	return Math.floor(new Date(d).getTime()/86400000);
}
// START-UP CODE
console.log("START");
var scrW=screen.width;
var scrH=screen.height;
console.log('screen size: '+scrW+'x'+scrH+'px');
id("canvas").width=scrW;
id("canvas").height=scrH;
console.log('canvas size: '+id("canvas").width+'x'+id("canvas").height);
canvas=id('canvas').getContext('2d');
totals=JSON.parse(window.localStorage.getItem('totals')); // grand totals for each monthly backup
console.log('totals: '+totals);
if(totals==null) totals=[];
console.log(totals.length+' totals');
// backupDay=window.localStorage.getItem('backupDay');
// if(!backupDay) backupDay=0;
// console.log('last backup on day '+backupDay);
latest=window.localStorage.getItem('latest');
if(!latest) {
	latest=new Date(0).toString(); // defaults to 1970
	window.localStorage.setItem('latest',latest);
}
load(); // WAS readData();
// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('sw.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
if(navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { // Register the ServiceWorker
	navigator.serviceWorker.register('sw.js', {scope: '/Money/'}).then(function(reg) {
	    console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
 