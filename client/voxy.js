
// VoXYPanelクラス
// jqelem: VoXYにするdiv jqueryエレメント
// name: パネル名
function VoXYPanel(jqelem, name)
{
	jqelem.html("<div class='viewborder'><div class='toolbar'></div><div class='viewbody'></div></div>");

	// パネル名
	this.name = name;
	// パネルの枠
	this.viewborder	= jqelem.children('.viewborder');
	// パネルボディ
	this.viewbody	= this.viewborder.children('.viewbody');
	// ツールバー
	this.toolbar	= this.viewborder.children('.toolbar');
	// リスニングしているかどうか
	this.listening = false;
	// セッションID
	this.session_id = 0;
	
	this.viewbody.width(640);
	this.viewbody.height(480);
	this.viewbody.data('panelobj', this);
	
	this.viewbody.bind('click', this, function(e){e.data.OnClick(e)});
	
	this.toolbar.html("<button class='voxy_toolbar_disconnect'>切断</button>");
	this.toolbar.children(".voxy_toolbar_disconnect").bind(
		'click', this, function(e){e.data.Disconnect()});

	WriteLog("Initialized");
}

VoXYPanel.prototype = {
	// パネルがクリックされたときのイベント
	OnClick: function(event)
	{

	},

	// ログインフォームを表示
	ShowLoginForm: function()
	{
		this.viewbody.width(640);
		this.viewbody.height(480);
		this.viewbody.html(
			"<div class='voxy_login_form'><form>"
			+"User: <input type='text' class='login_hostname' size='32' /><br />"
			+"Pass: <input type='password' class='login_password' size='32' /><br />"
			+"<input type='button' class='login_btn' value='Login' onclick='VoXYLogin(this.form);' />"
			+"</form></div>"
			);
		
	},
	
	// ログインする
	Login: function(hostname, password)
	{
		$.ajax({
			data: {
				hostname: hostname,
				password: password
			},
			url: '/login',
			dataType: 'json',
			context: this,
			success: this.LoginSuccess
		});
	},

	
	// ログインコマンドの応答ハンドラ
	LoginSuccess: function(data)
	{
		if(data.stat == 'ok')
		{
			this.session_id = data.session_id;
			this.ServerMessage(data.smsg);
			this.listening = true;
			this.SetListenTimer();
			this.viewbody.html("");
		}
	},

	// 切断する
	Disconnect: function()
	{
		this.listening = false;
		$.ajax({
			data: {
				session_id: this.session_id,
			},
			url: '/disconnect',
			dataType: 'json',
			context: this,
			success: function() {
				this.ShowLoginForm();
			}
		});
	},


	
	// Listenのタイマーを設定する
	SetListenTimer: function()
	{
		(function(obj, timeout_val){
			window.setTimeout(function(){obj.Listen();}, timeout_val);
		})(this, 1000);
	},

	// Listenコマンドをサーバーへ送信する
	Listen: function(data)
	{
		if(!this.listening)
			return;
		
		$.ajax({
			url: '/listen',
			data: {
				session_id: this.session_id
			},
			dataType: 'json',
			context: this,
			success: function(data){
				this.ServerMessage(data.smsg);
				this.SetListenTimer();
			}
		});

	},
	
	// サーバーからの更新情報を読み取る
	ServerMessage: function(smsg)
	{
		for(var i = 0; i < smsg.length; i++)
		{
			var msg = smsg[i];
			// タイルの更新
			if(msg[0] == 'UPDATETILE')
			{
				// [パネル名+座標+サイズ] をタグのIDにする
				tag_id = 'p-' + this.name +"_"+ msg[2] +"_"+ msg[3] +"_"+ msg[4] +"_"+ msg[5];
				imgtag = $('#'+tag_id);
				if(imgtag.length == 0) 
				{
					// 場所にマッチするimgタグが無かった場合
					// 新しく追加
					var offset = this.viewbody.offset();
					this.viewbody.append("<img id='"+tag_id+"' alt='screen' />")
					imgtag = $('#'+tag_id);
					imgtag.css('position', 'absolute');
					imgtag.css('left', offset.left + parseInt(msg[2]));
					imgtag.css('top', offset.top + parseInt(msg[3]));
					imgtag.width(msg[4]);
					imgtag.height(msg[5]);
					
					// タイルがパネルからはみ出していたら、パネルを大きくする
					if(this.viewbody.width() < parseInt(msg[2]) + parseInt(msg[4]))
						this.viewbody.width(parseInt(msg[2]) + parseInt(msg[4]));
					if(this.viewbody.height() < parseInt(msg[3]) + parseInt(msg[5]))
						this.viewbody.height(parseInt(msg[3]) + parseInt(msg[5]));
				}
				imgtag.attr('src', msg[1]);
			}
			// 解像度の変更
			else if(smsg[i][0] == 'CHNGRESOL')
			{
				WriteLog("Resolution update");
				this.viewbody.width(msg[1]);
				this.viewbody.height(msg[2]);
			}
		}
	}
}

// ログインフォームでログインボタンが押されたときの処理
function VoXYLogin(form)
{
	hostname = $(form).children('.login_hostname').attr('value');
	password = $(form).children('.login_password').attr('value');
	
	p = $(form).parent().parent();
	panelobj = p.data('panelobj');
	panelobj.Login(hostname, password);
}