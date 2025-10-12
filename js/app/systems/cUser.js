
function getTime(){
    var time=new Date();
	time.setHours(time.getHours()+8);
    time=time.toISOString().replace('T',' ').substring(0, 19);
	return time;
}

function validateForm_check_blank() 
{
    var x = document.forms["myForm"]["username"].value;
    var y = document.forms["myForm"]["password"].value;
    if ((x == null || x == "")||(y == null || y == "")) 
    {
        alert("不能输入空的内容！")
        return false;
    }
    return true;
}
function login()
    {
        if(validateForm_check_blank())
        {
            var username = document.getElementById("username").value;
            var pass = localStorage.getItem(username);
            if(pass!=null) 
            {
                if(pass[0]!='{')
                { 
                    localStorage.removeItem(username);
                    pass=null;
                }
            }
            var JSON_pass = JSON.parse(pass);
            if(pass!=null) 
            {
                var password = JSON_pass.password; 
                var cUser_pass = new cUser(username,password,JSON_pass);
            }
            if( pass==null)
                alert("用户名不存在，请注册！");
            else if(find(password))
            {
                cUser_pass.login();
                alert("登录成功！");
                window.location.href='./index.html';
            }
            else 
                alert("密码错误！请重试");
        }
    }
function find( password ) 
    {  
    var input_password=document.getElementById("password").value;
    if(input_password==password) return true;
    return false;
    }
function save() 
    {  
        var username = document.getElementById("username").value;  
        var password = document.getElementById("password").value; 
        var passwordd = document.getElementById("password2").value; 
        if(password!=passwordd) 
        {
            alert("请输入相同的密码！");
            return;
        }
        let cuser = new cUser(username,password);
        var Json_user = JSON.stringify(cuser);
        localStorage.setItem(username, Json_user);
        alert("注册成功！");
        window.location.href="./login.html";
    }
function reg()
{
    if(validateForm_check_blank())
    {
        var username = document.getElementById("username").value;
        var pass = localStorage.getItem(username);
        if(pass!=null) 
        {
            if(pass[0]!='{')
            { 
                localStorage.removeItem(username);
                pass=null;
            }
        }
        var JSON_pass = JSON.parse(pass);
        if(pass!=null) var password = JSON_pass.password;
        if(password==null)
        save();
        else
        alert("用户名已经存在！请换一个名字");
    }
}
function back()
{
    window.location.href="./login.html";
}

class cUser
{
    constructor(username, password, _JSON)
    {
        this.username=username;
        this.password=password;
        this.saveArray=new Array();
        this.achievementArray=new Array();
        if(_JSON!=null)
        {
            for(let i=0;i<_JSON.saveArray.length;i++)
            {
                if(_JSON.saveArray[i]!=null) this.saveArray[i] = new Save(_JSON.saveArray[i]);
                else this.saveArray[i] = null;
            }
            for(let i=0;i<_JSON.achievementArray.length;i++)
            {
                this.achievementArray[i]=_JSON.achievementArray[i];
            }
        }
    }
    login()
    {
        sessionStorage.setItem("loginUser",this.username);
        if(this.saveArray.length>=1)
        {
            var save_ = JSON.stringify(this.saveArray[0]);
            sessionStorage.setItem("currentSaveData",save_);
        } 
    }
    renew(saveNumber)
    {
        var mjson=sessionStorage.getItem("currentSaveData");
        var JSON_saveData=JSON.parse(mjson);
        var x_Time_ = getTime();

        var saveData = new Save(JSON_saveData);
        saveData.saveDate = x_Time_;
        this.saveArray[saveNumber] = saveData;

        var cUserJson=JSON.stringify(this);
        localStorage.setItem(this.username,cUserJson);
        alert("存储成功");
    }
}