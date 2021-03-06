importClass(android.content.pm.PackageManager);
importClass(android.provider.Settings);
importClass(android.app.KeyguardManager);
importClass(android.content.Context);
var myLog = "";
var myStr = "";
const w = device.width;
const h = device.height;
/* --------------------------------------预配置开始----------------------------------- */
const { serverUrl, companyName, morTime, nightTime, tokenUrl, maxTime, waitTime, pwd, isSendImg, account, accountPwd } = hamibot.env;

if (!morTime) {
    toastLog("请设置上班打卡时间范围");
    exitShell();
}

if (!nightTime) {
    toastLog("请设置下班打卡时间范围");
    exitShell();
}

if (!maxTime) {
    toastLog("请设置打卡随机时间");
    exitShell();
}

if (!waitTime) {
    toastLog("请设置等待时间");
    exitShell();
}
//上班打卡时间段
var goToWorkTime = morTime.split(';');

//下班打卡时间段
var afterWorkTime = nightTime.split(';');
/* --------------------------------------预配置结束----------------------------------- */

startProgram();

/**
 * 脚本流程
 */
function startProgram() {
    unlockIfNeed();
    sleep(waitTime * 1000);
    // 1.检查权限
    checkMyPermission();
    // 2.进入页面
    goToPage();
    handleOrgDialog();
    // 3.获取操作并执行
    var randTime = random(10, maxTime);
    toast(randTime + "s后开始打卡");
    sleep(randTime * 1000);
    setLog(randTime + "s后开始打卡");
    punchTheClock();
    // 4.获取结果
    getReslt();
    // 5.返回给用户
    exitShell();
}

/**
 * 手机是否锁屏
 */
function isLocked() {
    var km = context.getSystemService(Context.KEYGUARD_SERVICE);
    return km.isKeyguardLocked() && km.isKeyguardSecure();
}

/**
 * 解锁屏幕
 */
function unlockIfNeed() {
    device.wakeUpIfNeeded();
    if (!isLocked()) {
        return;
    }
    sleep(1200)
    var xyArr = [220];
    var x0 = w / 2;
    var y0 = h / 4 * 3;
    var angle = 0;
    var x = 0;
    var y = 0;
    for (let i = 0; i < 30; i++) {
        y = x * tan(angle)
        if ((y0 - y) < 0) {
            break;
        }
        var xy = [x0 + x, y0 - y]
        xyArr.push(xy)
        x += 5;
        angle += 3
    }
    gesture.apply(null, xyArr);
    function tan(angle) {
        return Math.tan(angle * Math.PI / 180);
    }
    if (pwd) {
        enterPwd();
    }
    setLog("解锁完毕");
}

/**
 * 输入手机解锁密码
 */
function enterPwd() {
    //判断是否已经上滑至输入密码界面
    for (int = 0; i < 10; i++) {
        if (!text(i).clickable(true).exists() && !desc(i).clickable(true).exists()) {
            setLog("解锁屏幕失败");
            exitShell();
        }
    }
    //点击
    if (text(0).clickable(true).exists()) {
        for (var i = 0; i < pwd.length; i++) {
            a = pwd.charAt(i)
            sleep(200);
            text(a).clickable(true).findOne().click()
        }
    } else {
        for (var i = 0; i < pwd.length; i++) {
            a = pwd.charAt(i)
            sleep(200);
            desc(a).clickable(true).findOne().click()
        }
    }
}

/**
 * 是否需要登录
 */
function loginIfNeed() {
    if (text("忘记密码").clickable(true).exists() || desc("忘记密码").clickable(true).exists()) {
        if (!account || !accountPwd) {
            setLog("当前未登录，请输入钉钉登录账号及密码");
            exitShell();
        }

        if (setText(0, account) && setText(1, accountPwd)) {
            if (text("忘记密码").clickable(true).exists()) {
                var loginBtnY = text("忘记密码").clickable(true).findOne().bounds().top - 10;
            } else {
                var loginBtnY = desc("忘记密码").clickable(true).findOne().bounds().top - 10;
            }
            click(w / 2, loginBtnY);
            setLog("登录成功");
        } else {
            setLog("登录失败");
            exitShell();
        }

    } else {
        setLog("已登录");
    }
}

/**
 * 上传截图至SMMS
 */
function uploadImg() {
    toastLog("上传打卡截图...");
    const url = "https://sm.ms/api/v2/upload";
    const fileName = "/sdcard/" + new Date().getTime() + ".png";
    captureScreen(fileName);

    let res = http.postMultipart(url, {
        smfile: open(fileName)
    }, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
        }
    });

    let jsonObj = JSON.parse(res.body.string());
    let isSuc = jsonObj.success;
    let imgUrl = jsonObj.data.url;
    let delUrl = jsonObj.data.delete;
    if (isSuc) {
        setLog("手机截图删除结果：" + ((files.remove(fileName) ? "成功" : "失败")));
        setLog("图床图片删除链接：");
        setLog(delUrl);
        setLog("打卡结果截图");
        myLog += '![logo](' + imgUrl + ')';
    } else {
        setLog("图片上传失败~");
    }
}

/**
 * 获取打卡结果
 */
function getReslt() {
    toastLog("等待10s，确保打卡操作完毕");
    sleep(10000);
    toastLog("识别打卡结果");

    try {
        if (!tokenUrl && !isSendImg) {
            if (textContains("打卡成功").exists() || descContains("打卡成功").exists()) {
                setLog("普通识别结果：" + myStr + "成功!");
            } else {
                setLog("普通识别结果：" + myStr + "失败!，扣你丫工资~");
            }
        }
        if (tokenUrl) {
            let str = getContentByOcr();
            if (str.indexOf("打卡成功") !== -1) {
                setLog("OCR识别结果：" + myStr + "成功!");
            } else {
                setLog("OCR识别结果：" + myStr + "失败!，扣你丫工资~");
            }
        }
        if (isSendImg) {
            uploadImg();
        }
    } catch (error) {
        setLog("识别打卡结果出错：" + '\n\n' + error.message);
    }
    back();
    back();
}

/**
 * 调用百度文字识别ocr得到当前手机截屏文字
 */
function getContentByOcr() {
    let img = captureScreen();
    access_token = http.get(tokenUrl).body.json().access_token;
    let url = "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic" + "?access_token=" + access_token;
    let imag64 = images.toBase64(img);
    let res = http.post(url, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, image: imag64, image_type: "BASE64" });
    str = JSON.parse(res.body.string()).words_result.map(val => val.words).join();
    return str;
}

/**
 * 打卡
 */
function punchTheClock() {
    setLog("当前操作：" + myStr);
    waitBtnShow();
    if (text(myStr).clickable(true).exists()) {
        text(myStr).clickable(true).findOne().click();
    }
    if (desc(myStr).clickable(true).exists()) {
        desc(myStr).clickable(true).findOne().click();
    }
}

/**
 * 等待进入钉钉登录界面或者主界面
 */
function waitStart() {
    let sTime = new Date().getTime();
    let delay = 30000;

    while ((new Date().getTime() - sTime) < delay) {
        if (text("忘记密码").exists() || desc("忘记密码").exists() ||
            text("工作台").exists() || desc("工作台").exists()) {
            break;
        }
        sleep(1000);
    }
}

/**
 * 等待打卡按钮出现
 */
function waitBtnShow() {
    let sTime = new Date().getTime();
    let delay = 60000;

    while ((new Date().getTime() - sTime) < delay) {
        if (textContains("已进入").exists() || descContains("已进入").exists()) {
            break;
        }
        sleep(1000);
    }
}

/**
 * 获取当前时间，格式:2019/11/26 15:32:27
 */
function getDateTime() {
    var date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    return year + '年' + month + '月' + day + '日' + hour + ':' + minute + ':' + second;
}

/**
 * 发送日志并退出脚本
 */
function exitShell() {
    if (serverUrl) {
        sendMsg(getDateTime() + " 打卡结果", myLog);
    }
    home();
    exit();
}

/**
 * 通过server酱推送消息
 * @param {*} title 标题
 * @param {*} msg 内容
 */
function sendMsg(title, msg) {
    let url = "https://sc.ftqq.com/" + serverUrl + ".send";
    var res = http.post(url, {
        "text": title,
        "desp": msg
    });
}

/**
 * 保存日志
 * @param {*} msg 
 */
function setLog(msg) {
    log(msg);
    msg += '\n\n';
    myLog += msg;
}

/**
 * 根据当前时间返回是上班打卡，还是下班打卡
 */
function getOptByTime() {
    let now = new Date();
    let yearStr = (now.getFullYear()) + "/" + (now.getMonth() + 1) + "/" + (now.getDate()) + ' ';

    for (i = 0; i < goToWorkTime.length; i++) {
        let e = goToWorkTime[i];
        let morStartTime = e.split('-')[0];
        let morEndTime = e.split('-')[1];
        //上班打卡时间段->时间类型
        let morStart = new Date(yearStr + morStartTime);
        let morEnd = new Date(yearStr + morEndTime);
        //判断当前时间是否可以进行上班打卡
        if (now > morStart && now < morEnd) {
            return "上班打卡";
        }
    }

    for (j = 0; j < afterWorkTime.length; j++) {
        let e = afterWorkTime[j];
        let nightStartTime = e.split('-')[0];
        let nightEndTime = e.split('-')[1];
        //下班打卡时间段->时间类型
        let nightStart = new Date(yearStr + nightStartTime);
        let nightEnd = new Date(yearStr + nightEndTime);
        //判断当前时间是否可以进行下班打卡
        if (now > nightStart && now < nightEnd) {
            return "下班打卡";
        }
    }

    return -1;
}

/**
 * 钉钉可能加入了多个公司，通过意图进入打卡页面会提示选择
 */
function handleOrgDialog() {
    if ("" == companyName || null == companyName) {
        return;
    }
    let delay = 30000;
    const flagStr = "请选择你要进入的考勤组织";
    let sTime = new Date().getTime();
    while ((new Date().getTime() - sTime) < delay) {
        if (text(flagStr).exists() || desc(flagStr).exists()) {
            if (textContains(companyName).clickable(true).exists()) {
                textContains(companyName).findOne().click();
                setLog("选择公司：" + companyName);
                return;
            }
            if (descContains(companyName).clickable(true).exists()) {
                descContains(companyName).findOne().click();
                setLog("选择公司：" + companyName);
                return;
            }
        } else {
            sleep(1000);
        }
    }
}

/**
 * 打开打卡页面
 */
function goToPage() {
    toastLog("打开钉钉中...");
    launch("com.alibaba.android.rimet");
    waitStart();
    loginIfNeed();
    sleep(waitTime * 1000);
    setLog("进入打卡页面");
    var a = app.intent({
        action: "VIEW",
        data: "dingtalk://dingtalkclient/page/link?url=https://attend.dingtalk.com/attend/index.html"
    });
    app.startActivity(a);
}

/**
 * 检查权限
 */
function checkMyPermission() {
    // 1.检查当前是否是打卡时间段
    myStr = getOptByTime();
    if (-1 === myStr) {
        setLog("当前时间不在设置的考勤范围内!!!");
        exitShell();
    }
    // 2.请求截图权限
    if (tokenUrl || isSendImg) {
        if (!requestScreenCapture()) {
            setLog("申请截图权限失败");
            exitShell();
        }
    }
    // 3.检查无障碍权限
    if (auto.service == null) {
        setLog("请打开无障碍服务,脚本退出！！！");
        sleep(3000);
        app.startActivity({ action: "android.settings.ACCESSIBILITY_SETTINGS" });
        exitShell();
    }
    toastLog("权限检查完毕");
}
