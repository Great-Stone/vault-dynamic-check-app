(function() {
    'use strict';
    window.addEventListener('load', function() {
      
    }, false);
})();

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

Date.prototype.YYYYMMDDHHMMSS = function () {
    var yyyy = this.getFullYear().toString();
    var MM = pad(this.getMonth() + 1,2);
    var dd = pad(this.getDate(), 2);
    var hh = pad(this.getHours(), 2);
    var mm = pad(this.getMinutes(), 2)
    var ss = pad(this.getSeconds(), 2)

    return `${yyyy}/${MM}/${dd}_${hh}:${mm}:${ss}`;
};

jQuery.fn.extend({
    autoHeight: function () {
      function autoHeight_(element) {
        return jQuery(element).css({
          'height': 'auto',
          'overflow-y': 'hidden'
        }).height(element.scrollHeight);
      }
      return this.each(function () {
        autoHeight_(this).on('input', function () {
          autoHeight_(this);
        });
      });
    }
});

setEnvText = () => {
    $("#env-textarea").val("export VAULT_SKIP_VERIFY=True\nexport VAULT_ADDR='http://192.168.0.102:5000'");
}

$("#re-env-button").click(function(){
    setEnvText();
});

$("#copy-button").click(function(){
    $("#env-textarea").select();
    document.execCommand('copy');
    $("#copy-icon").attr('class', 'bi-clipboard-check text-white');
    $("#copy-button").attr('class', 'btn btn-success');
    setTimeout(() => {
        $("#copy-icon").attr('class', 'bi-clipboard');
        $("#copy-button").attr('class', 'btn btn-outline-secondary');
    }, 2000);
});

const targetDB = [
    ['mssql', 'select * from information_schema.tables'],
    ['oracle', 'select * from tab;'],
    ['mongodb', '{ dbStats: 1}'],
    ['elastic', '']
]

let vueData = {}
for (i = 0; i < targetDB.length; ++i) {
    vueData[targetDB[i][0]] = {
        index: i + 1,
        username: '',
        password: '',
        query: targetDB[i][1],
        lastexcutedatetime: new Date().YYYYMMDDHHMMSS(),
        q_username: '',
        q_password: '',
        lease_id: '',
        result: '',
        is_repeat: false,
    }
}

$(document).ready(function(){

    setEnvText();

    workspaceList = new Vue({
        el: '#db-row',
        data: {
            datas: vueData
        },
        methods: {
            gen_credential: function(type, event){
                axios.get(`/${type}/new`).then(response => {
                    this.datas[type].username = response.data.data.username,
                    this.datas[type].password = response.data.data.password
                })
                .catch(function (error) {
                  console.log(error);
                });
            },
            exec_query: function(type, event){
                axios.post(`/${type}/query`, {
                    query: this.datas[type].query
                }).then(response => {
                    this.datas[type].q_username = response.data.secret.data.username
                    this.datas[type].q_password = response.data.secret.data.password
                    this.datas[type].lease_id = response.data.secret.lease_id
                    this.datas[type].result = JSON.stringify(response.data.result, undefined, 4)
                    this.datas[type].lastexcutedatetime = new Date().YYYYMMDDHHMMSS()
                })
                .catch(function (error) {
                    console.log(error);
                })
                .finally(function () {
                    $(`#${type}-result`).autoHeight();
                });
            },
            do_repeat: function(type, event){
                this.datas[type].is_repeat ^= true;
            },
            repeat_db: function(){
                setInterval(() => {
                    for(data in this.datas){
                        if(this.datas[data].is_repeat){
                            this.exec_query(data)
                        }
                    }
                }, 1000)
            }
        },
        created () {
            this.repeat_db()
        }
    })
});