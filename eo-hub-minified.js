    /*==========================================================================================================================
    EO-Hub.js
    called from Template
    
    REVISION HISTORY:

    04/21/2023, added getUserData() function
    03/03/2023, added version to src reference in head to force fresh download each day in test
    02/28/2023, simplified messaging for asyncApproveGroup() and update committee assignment
    02/22/2023, added changeRelationshipStatus()
    01/26/2023, releasing Mobilize integration
    10/24/2022, calling mojo group endpoint when group is approved
    09/21/2022, added mobilize listeners
    08/02/2022, added checkAccessForSlpAc()
    07/13/2022, hot fix for fiscal year advancing when renewal status is pening/wire/etc
    05/17/2022, added getTermsStatus()
    05/09/2022, adding updated version of getTermsStatus()
    05/01/2022, adding MyEO Champion
    04/02/2022, adding Mobilize syncronization
    03/02/2022, added displayGroupDetails()
    02/08/2022, added REST call to determine dates for on-leave member
    
    *==========================================================================================================================*/   
    
    var _mojoDomain = '';



    /*===============================================================================
    Listener: load
    
    *==============================================================================*/
    window.addEventListener('load', async function() {

        const debugMode = true;

        if (debugMode){
            console.log('load EventListener');
        }

        //works better in load
        const _prodDomain = 'https://hub.eonetwork.org/';
        const _currentDomain = JSON.parse(document.getElementById("__ClientContext").value).websiteRoot;

        _mojoDomain = _currentDomain.indexOf(_prodDomain) != -1 ? 'https://prod.mojosrv.com' : 'https://test.mojosrv.com';

       // _mojoDomain = ('https://hub.eonetwork.org/' == JSON.parse(document.getElementById("__ClientContext").value).websiteRoot) ? 'https://prod.mojosrv.com' : 'https://test.mojosrv.com';
       
        addMobilizeListeners();

        const _clientContext = JSON.parse(jQuery("#__ClientContext").val());
        //personalization
        if (_clientContext.isAnonymous == false){
            var _user = JSON.parse(localStorage.getItem("eoWebUser"));
            if (localStorage.getItem("eoWebUser") == null || _clientContext.selectedPartyId !== _user.MemberId) {
                //get user data from iMIS
                _user = await retrieveUserData();
                jQuery(".member-name").text(_user.FirstName + ' ' + _user.LastName)
                jQuery(".member-dropdown-content").appendTo( jQuery("li.member-dropdown"));
                jQuery(".member-dropdown-content").removeClass('hidden');
            }
        }

        const _websiteRoot = JSON.parse(document.getElementById("__ClientContext").value).websiteRoot

        //call GA only if on prod Hub
        if (_websiteRoot == 'https://hub.eonetwork.org/' ){
            googleAnalytics();
        }

        //call LiveChat only if  Hub (dev, test or prod)
        const _hubRoots = ['https://eodev.imiscloud.com/','https://eotest.imiscloud.com/','https://hub.eonetwork.org/']
        if (_hubRoots.indexOf(_websiteRoot) > -1) {
            //callLiveChat();  CALLING FROM FOOTER 1.26.2023

            const _currentUrl = window.location.href.toLowerCase();
            const _termsUrl = '/web/shared_content/common/termsconditions.aspx';

            if (JSON.parse(document.getElementById("__ClientContext").value).isAnonymous == false
              && _currentUrl.indexOf(_termsUrl) == -1 ) {
                //console.log('about to call needs from main script');
                let _terms = await needsEoTerms();
                if (debugMode){
                    console.log("_terms results:");
                    console.log(_terms);
                }
                if (_terms.needsInitial || _terms.needsRenewal){
                    console.log('redirect to terms')
                    //if (_websiteRoot == 'https://hub.eonetwork.org/' ){
                        window.location.replace('/web/shared_content/common/termsconditions.aspx' + '?returnUrl=' + window.location.pathname );
                    //}
                } 
            }

            //createMegaMenu();
            //menu tweaks from top menu
            //jQuery("button.searchbar-toggle").unbind("click");
            //jQuery("button.searchbar-toggle").on("click", function(){ window.location='/Search'  });
            /*
            if (jQuery(".navbar-toggle.collapsed.menu-toggle").css("display") == 'inline-block'){
            // jQuery("li.greeting a.NavigationLink span.nav-text:contains('Hello')").addClass('hidden')
            }
            //add member's name to dropdown
            var memberName = getUserName();
            if (memberName != '' && memberName != "GUEST ") {
                jQuery(".member-name").text(memberName)
                jQuery(".member-dropdown-content").appendTo( jQuery("li.member-dropdown"));
                jQuery(".member-dropdown-content").removeClass('hidden');
            }*/
    

        }   
        
        //if we aren't on the access_slp_ac.aspx page and we are on a hub site, then check for SLP/AC access permission
        if (_clientContext.isAnonymous == false && window.location.href.indexOf('/Web/Hub_Access_SLP_AC.aspx') == -1 && _hubRoots.indexOf(_websiteRoot) > -1) {
            checkAccessForSlpAc();
        } 

        (function ($) {
            function onPartialPostBack() 
            {
                if (debugMode){
                    console.log('onPartialPostBack');
                }
                
                //need to call here as well so listeners active after postback
                addMobilizeListeners();


            }
            Sys.WebForms.PageRequestManager.getInstance().add_pageLoaded(onPartialPostBack);
        })(jQuery);
    
    });

    /*===============================================================================
    Listener: DOMContentLoaded
    
    *==============================================================================*/

    document.addEventListener('DOMContentLoaded', function() {
        let debugMode = false;

        if (debugMode){
            console.log('DOMContentLoaded');
        }        
    }, false);

    
    /*===============================================================================
    addMobilizeListeners()
    IMPORTANT: must add Industry class to industry panel AND Interest class to interst
    panel wherever they are used. We use these classes to find the delete buttons.
    ex: /Web/Contact_Management/MyAccount/EO-Mbr-Profile/Tabs/Industries-and-Interests.aspx 
    *==============================================================================*/

    function addMobilizeListeners(){
        
        const debugMode = true;

        if (debugMode){
            console.log('addMobilizeListeners');
        }

        //finds a specific select list,
        //traverses all parents to find great grandparent #MainPanel
        //then traverses all children to FIND the Save input button
        
        let _btnIndustry = jQuery("select[id$='Industry']").parents("#MainPanel").find("input[type=button].SaveAndClose")
        if (_btnIndustry.length == 1){
            if (debugMode){
                console.log("Found Industries Save and Close button from addMobilizeListeners(): " + _btnIndustry.length)
            }
            jQuery(_btnIndustry).on('click', callIndustriesOnPostback)
        }
        

        // delete button for Industry on standard multi-instance panel
        let _btnDeleteIndustry = jQuery('.Industry').find("[id$='DeleteColumn']")
        if (_btnDeleteIndustry.length > 0){
            if (debugMode){
                console.log("Found Industry Delete button from addMobilizeListeners(): " + _btnDeleteIndustry.length)
            }
            jQuery(_btnDeleteIndustry).on('click', callIndustriesOnPostback)
        }

        let _btnInterest = jQuery("select[id$='MainInterest']").parents("#MainPanel").find("input[type=button].SaveAndClose")
        if (_btnInterest.length == 1){
            if (debugMode){
                console.log("Found Interest Save button from addMobilizeListeners(): " + _btnInterest.length)
            }
            
            if (1==1){
                jQuery(_btnInterest).on('click', callInterestsOnPostback)
            }
            else {
                //could hide original, insert new button
                //new button calls mojo first and then click for standard button
                jQuery(_btnInterest).removeAttr('onclick');
                jQuery(_btnInterest).on('click', mojo)
                //document.getElementById("ctl00_SaveAndCloseButton").setAttribute("onclick","console.log('mojoMemberInterests coming');if(this.disabled)return false;if(!RunAllValidators(undefined, true)) return false;this.disabled='disabled';await mojoMemberInterests();__doPostBack('ctl00$SaveAndCloseButton','')")    
            }
            //
        }

        // delete button for Interests on standard multi-instance panel
        let _btnDeleteInterest = jQuery('.Interest').find("[id$='DeleteColumn']")
        if (_btnDeleteInterest.length > 0){
            if (debugMode){
                console.log("Found Interest Delete button from addMobilizeListeners(): " + _btnDeleteInterest.length)
            }
            jQuery(_btnDeleteInterest).on('click', callInterestsOnPostback)
        }

        //find Save And Close on Edit Address Popup
        let _btnAddress = jQuery("[id$='Edit_TextAddress1']").parents('#MainPanel').find("input[type=button].SaveAndClose")
        if (_btnAddress.length > 0) {
            if (debugMode){
                console.log('Found address save button from addMobilizeListeners()');
                console.log(_btnAddress);
            }
            jQuery(_btnAddress).on('click', mojoMemberDetails );
        }

        let _btnHeadshot = jQuery("[id$='ciMiniProfile_contactPicture_submit']");
        if (_btnHeadshot.length > 0) {
            if (debugMode){
                console.log('Found headshot button from addMobilizeListeners()');
            }
            jQuery(_btnHeadshot).on('click', mojoMemberHeadshot );
        }

        //find Save for name fields in Hub panel
        let _btnName = jQuery('[id$="FirstName"]').closest('.panel-body').find('[id$="SaveButton"]')
        if (_btnName.length > 0){
            if (debugMode){
                console.log('Found Save Name button from addMobilizeListeners()');
            }
            
            jQuery(_btnName).on('click', mojoMemberDetails ); 
        }

        //find SaveAndClose for name fields in Staff
        let _btnStaffNameSaveClose = jQuery('[id$="FirstName"]').closest('#MainPanel').find('[id$="SaveAndCloseButton"]')
        if (_btnStaffNameSaveClose.length > 0){
            if (debugMode){
                console.log('Found Staff SaveAndClose Name button from addMobilizeListeners()');
            }
            
            jQuery(_btnStaffNameSaveClose).on('click', mojoMemberDetails ); 
        }

        //find Save for name fields in Staff
        let _btnStaffNameSave = jQuery('[id$="FirstName"]').closest('#MainPanel').find('[id$="SaveAndCloseButton"]')
        if (_btnStaffNameSave.length > 0){
            if (debugMode){
                console.log('Found Staff Save Name button from addMobilizeListeners()');
            }
            
            jQuery(_btnStaffNameSave).on('click', mojoMemberDetails ); 
        }
        //Save on Core Team Updates
        //look for chapter select
        let _btnCoreTeamUpdates = jQuery("select[id$='Chapter']").parents("#MainPanel").find("input[type=button].Save")
        if (_btnCoreTeamUpdates.length == 1){
            if (debugMode){
                console.log("Found Core Team Updates Save button from addMobilizeListeners()")
            }
            jQuery(_btnCoreTeamUpdates).on('click', mojoMemberDetails)
        }
    }    


    /*===============================================================================
    postbackForInterestsIndustries()
    todo: could have loadInterestsIndustries() and move code from page to that ()
    *==============================================================================*/
    function postbackForInterestsIndustries() {

        if (localStorage.getItem('callIndustriesOnPostback') == 'True') {
            mojoMemberIndustries();
            localStorage.setItem('callIndustriesOnPostback', 'Done')
        } 
        
        if (localStorage.getItem('callInterestsOnPostback') == 'True') {
            mojoMemberInterests();
            localStorage.setItem('callInterestsOnPostback', 'Done')
        } 
    }

    /* add this script to content page
    copying here for reference in case someone deletes from page
    (function ($) {
        function onPartialPostBack() 
        {
            console.log('onPartialPostBack for Interests and Industries');
            postbackForInterestsIndustries();
        }
        Sys.WebForms.PageRequestManager.getInstance().add_pageLoaded(onPartialPostBack);
    })(jQuery); 
    */


    /*===============================================================================
    callIndustriesOnPostback()
    
    *==============================================================================*/
    function callIndustriesOnPostback() {

        localStorage.setItem('callIndustriesOnPostback', 'True')    

    }

    /*===============================================================================
    callInterestsOnPostback()
    
    *==============================================================================*/
    function callInterestsOnPostback() {

        localStorage.setItem('callInterestsOnPostback', 'True')    

    }


    /*===============================================================================
    mojo()
    alternative approach of controlling when mojo call is made
    this is called from Save button
    *==============================================================================*/
    async function mojo() {

        if(this.disabled)return false;
        if(!RunAllValidators(undefined, true)) return false;
        this.disabled='disabled';
        await __doPostBack('ctl00$SaveAndCloseButton','')
        console.log('mojoMemberInterests call now');
        await mojoMemberInterests();

    return true;
    }



    /*===============================================================================
    retrieveUserData()
    retrieve data about current user and save in local storage
    *==============================================================================*/
    async function retrieveUserData() {
        const debugMode = true;

        var _user = {};

        const _clientContext = JSON.parse(jQuery("#__ClientContext").val());


        if (_clientContext.isAnonymous == true){
            localStorage.removeItem("eoWebUser");
        } else if ( window.localStorage.getItem('eoWebUser') !== null && _clientContext.selectedPartyId === JSON.parse(window.localStorage.getItem('eoWebUser')).MemberId){
            _user = JSON.parse(localStorage.getItem("eoWebUser"));
        } else {
            const hostname = window.location.hostname;
            const ajaxUrl = "https://" + hostname + "/api/IQA?QueryName=$/_eoREST/eoWebUserById&ID=" + _clientContext.selectedPartyId ;
            if (debugMode){
                console.log('ajaxUrl='+ ajaxUrl);
            }

            await jQuery.ajax(ajaxUrl, {
                type: "GET",
                contentType: "application/json",
                headers: {
                    RequestVerificationToken: document.getElementById( "__RequestVerificationToken").value
                },
                success: function (data){
                    _user["MemberId"] = data.Items.$values[0].Properties.$values[1].Value;
                    _user["FirstName"] = data.Items.$values[0].Properties.$values[2].Value;
                    _user["LastName"] = data.Items.$values[0].Properties.$values[3].Value;
                    _user["Email"] = data.Items.$values[0].Properties.$values[4].Value;
                    _user["MemberType"] = data.Items.$values[0].Properties.$values[5].Value;
                    _user["ChapterId"] = data.Items.$values[0].Properties.$values[6].Value;
                    _user["ChapterName"] = data.Items.$values[0].Properties.$values[7].Value;
                    _user["JoinDate"] = data.Items.$values[0].Properties.$values[8].Value;

                    //store user data
                    localStorage.setItem("eoWebUser", JSON.stringify(_user));
                },
                error: function(xhr, status, error){
                    console.log(`retrieveUserData() Error: ${xhr.responseText}`);
                }
            });
        }

        return _user;
    }

    function getUserName() {

        let _name = '';//initialize to blank in case guest
        let _user = {};

        const debugMode = true;
        const _clientContext = JSON.parse(jQuery("#__ClientContext").val());

        if (_clientContext.isAnonymous == false){
            //var isAuthenticated = true;
            //attempt to retrieve eoWebUser in local storage. need to test if we need to retrieve fresh or not

            if ( JSON.parse(localStorage.getItem("eoWebUser")) == null || _clientContext.selectedPartyId !== JSON.parse(localStorage.getItem("eoWebUser")).MemberId) {
                //we need to get user data from iMIS
                _user = retrieveUserData(); 
            } else { 
                _user = JSON.parse(localStorage.getItem("eoWebUser"));
            }
            if (_user.FirstName !== null){
                _name = _user.FirstName + " " + _user.LastName;   
            }
        }
        
        if (debugMode){
            console.log('getUserName returning ' + _name);
        }
        
        return _name;
    }

/*
    async function getUserData() {

        const debugMode = true;
        const _clientContext = JSON.parse(jQuery("#__ClientContext").val());

        if (_clientContext.isAnonymous == false){
            //var isAuthenticated = true;
            //attempt to retrieve eoWebUser in local storage. need to test if we need to retrieve fresh or not
            
            if (localStorage.getItem("eoWebUser") == null || _clientContext.selectedPartyId !== _user.MemberId) {
                //we need to refresh user data from iMIS
                alert('we need to refresh');
                retrieveUserData();
                //assign new data to _user
                let _user = JSON.parse(localStorage.getItem("eoWebUser"));
            } else {
                let _user = JSON.parse(localStorage.getItem("eoWebUser"));
            }
            
        } else {
            return
        }
        
       await retrieveUserData();
       let _user = JSON.parse(localStorage.getItem("eoWebUser"));

        if (debugMode){
            console.log('getUserData{} returning:')
            console.log(_user);
        }
        
        return _user;
    }

*/

    /*===============================================================================
    googleAnalytics() - NOT IN USE. THIS HAS BEEN ADDED TO HUB HEADER
    retrieve data about current user and save in local storage
    *==============================================================================*/
    function googleAnalytics() {  
        const debugMode = false;
        const _user = JSON.parse(localStorage.getItem("eoWebUser"));

        if (debugMode){
            console.log('googleAnalytics() called');
            console.log(_user);
        }

        window.dataLayer = window.dataLayer || [];
   //     function gtag(){dataLayer.push(arguments);}
   //    gtag('js', new Date());

        const _selectedPartyId = JSON.parse(document.getElementById("__ClientContext").value).selectedPartyId;
        const _guestImisId = '217';
        
        if (_selectedPartyId != _guestImisId){
    //        gtag('config', 'G-MBQNV60Y14', {
    //            'user_id': _selectedPartyId,
    //        });
        } else {
    //       gtag('config', 'G-MBQNV60Y14');
        } 
        //old method
        /* new method adding additional demographics
        if (_user.Chapter.length > 0){
            gtag('set', 'user_properties', {
                'Chapter'       : _user.ChapterName,
                'ChapterId'     : _user.ChapterId,
                'MemberType'    : _user.MemberType,
                'JoinDate'      : _user.JoinDate 
            })
        }
        */
    } 

/*
    t("create", "UA-17922425-4", "auto", {
        userId: `${e.id} - ${e.fullName}`
    }), t("set", "dimension1", e.memberType), t("set", "dimension2", e.paidThrough), t("set", "dimension3", e.company), t("set", "dimension4", e.companyId), t("set", "dimension6", e.joinDate), t("send", "pageview")
}*/
    /*===============================================================================
    callLiveChat()

    *==============================================================================*/
    async function callLiveChat(){

        const debugMode = false;

        const _user =  await retrieveUserData();

        if (debugMode){
            console.log('callLiveChat() user:');
            console.log(_user);
        }

        //TODO:Only call LiveChat if user is Member, Accelerator or Staff
        //TODO: verify MemberId in eoWebUser matches SelectedParty

        if (_user !== null) {

            window.__lc = window.__lc || {};
            window.__lc.license = 10864037;
            window.__lc.visitor = {
                name: _user.FirstName + " " + _user.LastName,
                email: _user.Email
            };
            window.__lc.params = [{
                name: 'EO Chapter',
                value: _user.ChapterName
            }, {
                name: 'Leadership',
                value: ''//CurrentLeadershipPosition
            }, {
                name: 'EO Region',
                value: ''//EORegion
            }, {
                name: 'EO Join Date',
                value: _user.JoinDate
            }];
            (function() {
                var lc = document.createElement('script');
                lc.type = 'text/javascript';
                lc.async = true;
                lc.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'cdn.livechatinc.com/tracking.js';
                var s = document.getElementsByTagName('script')[0];
                s.parentNode.insertBefore(lc, s);
            })();
			
		
	    const _mbrID = JSON.parse(document.getElementById("__ClientContext").value).selectedPartyId;
		if( (_mbrID != 'undefined' && _mbrID  != '217')){
			
		 var waitForLC = setInterval(function () {
				if (window.LC_API === undefined) {
			return;
			}
			clearInterval(waitForLC);
			
		
			
			var showUnavailableStatus = function(show){
				var footerDiv = document.getElementById('ft');
				var offlineIcon = document.createElement("div");
				offlineIcon.innerHTML = '<a class="hide-for-small" target="_blank" href="https://forms.monday.com/forms/e8c3fe8add707b272f27ec171e1e4f58?r=use1"><img id="live-chat-notice" width="82" src="https://eonetwork.org/PublishingImages/live-chat-offline.png"></a>';
			    offlineIcon.id = "hide-for-small";
				document.getElementById("ctl01_masterWrapper").insertBefore(offlineIcon,footerDiv );
				var style = show ? "block" : "none";
				offlineIcon.style.display = style;
				
			}
			LC_API.on_after_load = function() {
				if (!LC_API.agents_are_available()) {
					console.log('LC_API.agents_are_available.yesif');

					// showUnavailableStatus(false);
				} else {
					console.log('LC_API.agents_are_available.else');
					 showUnavailableStatus(true);
				}
			};
			LC_API.on_chat_state_changed = function(data) {
					showUnavailableStatus(data.state==="offline");
			};
		 }, 100);	
				
		}		
								
    
         /*   var LC_API = LC_API || {};
			console.log('LC_API.agents_are_available'+LC_API.agents_are_available());
            LC_API.on_after_load = function() {
                if (LC_API.agents_are_available()) {
                    console.log('LC_API.agents_are_available.ifStatement');
                    jQuery('#ft').before('<a class="hide-for-small" target="_blank" href="https://forms.monday.com/forms/e8c3fe8add707b272f27ec171e1e4f58?r=use1"><img id="live-chat-notice" width="82" src="https://eonetwork.org/PublishingImages/live-chat-offline.png"></a>');
                }
            }; */

        }
    }

    /*===============================================================================
    checkAccessForSlpAc()
    
    *==============================================================================*/
    function checkAccessForSlpAc() {
    
        const debugMode = false;

        if (debugMode){
            console.log('checkAccessForSlpAc()');
        }

        const _ajax = `https://${window.location.hostname}/api/Query?QueryName=$/_EORest/AccessForSlpAc`;
    
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){
                //console.log(_data);
                if (_data.TotalCount > 0) {
                    if (_data.Items.$values[0].Member_Access == 'DENIED'
                        || (_data.Items.$values[0].MemberType == 'SLP' && _data.Items.$values[0].SpouseLifePartnerAccess !== '1')
                        || (_data.Items.$values[0].MemberType == 'AC' && _data.Items.$values[0].AdultChildrenAccess !== '1' )
                        ){
                        //redirect to page displaying access msg
                        window.location.assign('/web/Web/Hub_Access_SLP_AC.aspx');
                    }
                }
            },
            error: function(xhr, status, error){
                console.log(`checkAccessForSlpAc() Error: ${xhr.responseText}`);
            }
        });
    }
    
    
    
    /*===============================================================================
    getGuid() 
    Generate a new GUID
    *==============================================================================*/
    function getGuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }


    
    /*===============================================================================
    getTermsStatus() 
    New T&Cs testing of legacy data
    *==============================================================================*/
    async function getTermsStatus(){

        const debugMode = false;
        if (debugMode){
            console.log('getTermsStatus()');
        }
        //we don't want the popup for these pages
        const _termsUrl = '/web/shared_content/common/termsconditions.aspx';
        const _privacyUrl = '/web/contact-us/privacy-notice.aspx';
        const _sectionUrl = '/privacy';
        const _uploadedFiles = '/common/uploaded';
        const _signinUrl = '/web/login/web/eosignin.aspx';
        const _safeUrl = 'termsconditions.aspx';
        const _pseudocode = '/pseudocode/';
        const _currentUrl = window.location.href.toLowerCase();
        const _returnUrl = window.location.pathname;
        const _guestImisId = '217';
        const _returnValue = false; //default to false
    
    
        //we will default to needing both agreements to ensure no one slips through
        //then our tests below will determine if member doesn't need
        var __needsInitialAgreement = false;
        var __needsAnnualAgreement = false;
        var _needsNextAnnualAgreement;
        var _alreadySigned;
    
        if (JSON.parse(document.getElementById("__ClientContext").value).selectedPartyId != _guestImisId 
            && (_currentUrl.indexOf(_termsUrl) == -1 
            && _currentUrl.indexOf(_privacyUrl) == -1 
            && _currentUrl.indexOf(_sectionUrl) == -1
            && _currentUrl.indexOf(_uploadedFiles) == -1
            && _currentUrl.indexOf(_pseudocode) == -1
            && _currentUrl.indexOf(_signinUrl) == -1)) {
    
            //NOTE: we need to perform these checks in sequence, so using await on both ajax calls
            //New Checks, added May 2022
            //check the renewal fields from legacy crm found in eo_individual. if they have been declared as renewed (ex: by wire, credit card, payment pending) then
            // AND they haven't already signed, we need to present the bylaws popup for signature
    
            _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetLegacyRenewalStatus";
    
            await jQuery.ajax(_ajax, {
                type: "GET",
                contentType: "application/json",
                headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
                success: function(data) {
                    let _record = data["Items"]["$values"][0]; //initialize
                    if (debugMode){
                        console.log('Pull from Membership tab follows');
                    }
    
                    // if member has renewed (legacy RenewalStatus is one of the values below)
                    // then we need to see if we collected initials on the legacy form
                    // so let's check for those values below
                    if (['1','10','11','12','5','6','7','8','9'].indexOf(_record.RenewalStatus) != -1){                   
                        if (_record.RenewalAgreement === '1' && !(!_record.AgreementInitials) ){
                            _alreadySigned = true;
                        } 
                    } 
                },//success
                error: function(xhr, status, error){
                    console.log(`Error: Legacy data call in getTermsStatus(): ${xhr.responseText}`);
                }
            });//ajax call
            //////////////////////////////////////////////////// end new checks
            
    
            if (typeof _alreadySigned === 'undefined'){
             
                //using filters in business objects for initial bylaws and annual renewal to control for date ranges
                _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetBylawsStatus";
    
                await jQuery.ajax(_ajax, {
                    type: "GET",
                    contentType: "application/json",
                    headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
                    success: function(data) {
                        if (debugMode){
                            console.log('Results GetBylawsStatus iqa');
                            console.log(data);
                        }
    
                        //if no records returned, must mean we don't have a set of instructions in the bylaws panel for the user's member type
                        //thus, no agreement is required for initial or annual
                        if (data["TotalCount"] == 0){
                            if (debugMode){
                                console.log("GetBylawStatus IQA returned no results, so no further testing necessary for this member type.");   
                            }
                            __needsInitialAgreement = false;
                            __needsAnnualAgreement = false;
                        }
                        else {
    
                            let _record = data["Items"]["$values"][0];
                            let _memberType = _record.MemberType;
    
                            // determine current EO fiscal year
                            // note EO FY is really more like a membership term
                            let d = new Date();
                            let y = d.getFullYear();
    
                            //determine which FY we should be checking
                            //0=Jan, so 3=April
                            if (d.getMonth() >= 3){
                                y++;
                            }
    
                            let _fiscalYear = y.toString();
    
                            for (let i = 0; i < data["TotalCount"]; i++) {
                                _record = data["Items"]["$values"][i];
                                if (debugMode){
                                    console.log('Bylaws=' + _record.Bylaws);
                                    console.log('Renewals=' + _record.Renewals);
                                    console.log('Bylaws=' + _record.FiscalYear);
                                }
                                if  (_record.Bylaws == 'Agree'){
                                    var _foundInitial = true;
                                    if (debugMode)
                                        console.log("Passed Panel - Found Initial Areement");
                                } else {
                                    if (debugMode)
                                        console.log("Failed to find Initial");
                                }
    
                                //check for _record.FiscalYear >= _fiscalYear 
                                //this achieves 2 things: a) members should renew before end of current fiscal year
                                //b) in case member might have missing data last year from legacy
    
                                if (_record.Renewals == 'Agree' && _record.FiscalYear >= _fiscalYear){
                                    var _foundRenewal  = true;
                                    if (debugMode)
                                        console.log("Passed Panel Test - Found Renewal");
                                } else {
                                    if (debugMode)
                                        console.log("Failed Renewal Panel Test - Looking for: " + _fiscalYear);
                                }
                            }
    
                            if (typeof _foundInitial  === 'undefined'){
                                __needsInitialAgreement = true;
                            }
    
                            if (typeof _foundRenewal  === 'undefined'){
                                __needsAnnualAgreement = true;
                            }else if (_foundRenewal){
                                __needsAnnualAgreement = false;
                            }
                        } //end else for total count
                    }, /*end success*/
                    error: function(xhr, status, error){
                        console.log(`Error: GetBylawsStatus retrieval in getTermsStatus(): ${xhr.responseText}`);
                    }
                }); /*end ajax call */            
            }

            // if person needs agreement, redirect to that page
            // we are keeping track of returnUrl in case we want to use some day
            //await until both checks above have been performed
            if (__needsInitialAgreement || __needsAnnualAgreement){
                if (window.location.hostname == 'hub.eonetwork.org'){
                    window.location.replace(_termsUrl + '?returnUrl=' + window.location.pathname);
                } else {
                    console.log('Result - Display Terms')
                }
            }
        } /* end if*/
    } /* /getTermsStatus()*/
    

    /*===============================================================================
    needsEoTerms() 
    Determine if user needs to be presented with Terms & Conditions
    *==============================================================================*/
    async function needsEoTerms(){

        let _returnValue = false; //default to false
        let _return = {needsInitial: false, needsRenewal: false};

        const debugMode = false;

        //we don't want the popup for these pages
        const _termsUrl = '/web/shared_content/common/termsconditions.aspx';
        const _privacyUrl = '/web/contact-us/privacy-notice.aspx';
        const _sectionUrl = '/privacy';
        const _uploadedFiles = '/common/uploaded';
        const _signinUrl = '/web/login/web/eosignin.aspx';
        const _safeUrl = 'termsconditions.aspx';
        const _pseudocode = '/pseudocode/';
        const _currentUrl = window.location.href.toLowerCase();
        const _returnUrl = window.location.pathname;
       
    
        //we will default to needing both agreements to ensure no one slips through
        //then our tests below will determine if member doesn't need
        var __needsInitialAgreement = false;
        var __needsAnnualAgreement = false;
        var _needsNextAnnualAgreement;
        var _alreadySigned;
    
        if (JSON.parse(document.getElementById("__ClientContext").value).isAnonymous == false 
            && (_currentUrl.indexOf(_privacyUrl) == -1 
            //&& _currentUrl.indexOf(_termsUrl) == -1 
            && _currentUrl.indexOf(_sectionUrl) == -1
            && _currentUrl.indexOf(_uploadedFiles) == -1
            && _currentUrl.indexOf(_pseudocode) == -1
            && _currentUrl.indexOf(_signinUrl) == -1)) {
    
            //NOTE: we need to perform these checks in sequence, so using await on both ajax calls
            //New Checks, added May 2022
            //check the renewal fields from legacy crm found in eo_individual. if they have been declared as renewed (ex: by wire, credit card, payment pending) then
            // AND they haven't already signed, we need to present the bylaws popup for signature

            _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetLegacyRenewalStatus";
    
            await jQuery.ajax(_ajax, {
                type: "GET",
                contentType: "application/json",
                headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
                success: function(data) {
                    let _record = data["Items"]["$values"][0]; //initialize
                    if (debugMode){
                        console.log('Pull from Membership tab follows');
                    }
    
                    // if member has renewed (legacy RenewalStatus is one of the values below)
                    // then we need to see if we collected initials on the legacy form
                    // so let's check for those values below
                    if (['1','10','11','12','5','6','7','8','9'].indexOf(_record.RenewalStatus) != -1){                   
                        if (_record.RenewalAgreement === '1' && !(!_record.AgreementInitials) ){
                            _alreadySigned = true;
                        } 
                    } 
                },//success
                error: function(xhr, status, error){
                    console.log(`Error: Legacy data call in needsTerms(): ${xhr.responseText}`);
                }
            });//ajax call
            //////////////////////////////////////////////////// end new checks
            
    
            if (typeof _alreadySigned === 'undefined'){
             
                //using filters in business objects for initial bylaws and annual renewal to control for date ranges
                _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetBylawsStatus";
    
                await jQuery.ajax(_ajax, {
                    type: "GET",
                    contentType: "application/json",
                    headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
                    success: function(data) {
                        if (debugMode){
                            console.log('Results GetBylawsStatus iqa');
                            console.log(data);
                        }
    
                        //if no records returned, must mean we don't have a set of instructions in the bylaws panel for the user's member type
                        //thus, no agreement is required for initial or annual
                        if (data["TotalCount"] == 0){
                            if (debugMode){
                                console.log("GetBylawStatus IQA returned no results, so no further testing necessary for this member type.");   
                            }
                            __needsInitialAgreement = false;
                            __needsAnnualAgreement = false;
                        }
                        else {
    
                            let _record = data["Items"]["$values"][0];
                            let _memberType = _record.MemberType;
    
                            // determine current EO fiscal year
                            // note EO FY is really more like a membership term
                            let d = new Date();
                            let y = d.getFullYear();
    
                            //determine which FY we should be checking
                            //0=Jan, so 3=April
                            if (d.getMonth() >= 3){
                                y++;
                            }
    
                            let _fiscalYear = y.toString();
    
                            for (let i = 0; i < data["TotalCount"]; i++) {
                                _record = data["Items"]["$values"][i];
                                if (debugMode){
                                    console.log('Bylaws=' + _record.Bylaws);
                                    console.log('Renewals=' + _record.Renewals);
                                    console.log('FiscalYear=' + _record.FiscalYear);
                                }
                                if  (_record.Bylaws == 'Agree'){
                                    var _foundInitial = true;
                                    if (debugMode)
                                        console.log("Passed Panel - Found Initial Areement");
                                } else {
                                    if (debugMode)
                                        console.log("Failed to find Initial");
                                }
    
                                //check for _record.FiscalYear >= _fiscalYear 
                                //this achieves 2 things: a) members should renew before end of current fiscal year
                                //b) in case member might have missing data last year from legacy
    
                                if (_record.Renewals == 'Agree' && _record.FiscalYear >= _fiscalYear){
                                    var _foundRenewal  = true;
                                    if (debugMode)
                                        console.log("Passed Panel Test - Found Renewal");
                                } else {
                                    if (debugMode)
                                        console.log("Failed Renewal Panel Test - Looking for: " + _fiscalYear);
                                }
                            }
    
                            if (typeof _foundInitial  === 'undefined'){
                                __needsInitialAgreement = true;
                                _return.needsInitial = true;
                            }
    
                            if (typeof _foundRenewal  === 'undefined'){
                                __needsAnnualAgreement = true;
                                _return.needsRenewal = true;
                            }else if (_foundRenewal){
                                __needsAnnualAgreement = false;
                                _return.needsRenewal = false;
                            }
                        } //end else for total count
                    }, /*end success*/
                    error: function(xhr, status, error){
                        console.log(`Error: GetBylawsStatus retrieval in getTermsStatus(): ${xhr.responseText}`);
                    }
                }); /*end ajax call */            
            }
            // DELETE THIS!
            // if person needs agreement, redirect to that page
            // we are keeping track of returnUrl in case we want to use some day
            //await until both checks above have been performed
            if (__needsInitialAgreement || __needsAnnualAgreement){
                _returnValue = true;
            }
        } /* end if*/

        if (debugMode){
            console.log('needsEoTerms()->' + _returnValue);
        }
       
        return _return;
        //return _returnValue;

    } /* needsEoTerms()*/
        
 /*===============================================================================
 onTermsLoad()
 Determine if the SelectedParty needs to be presented with the bylaws. Get ID
 and apply business rules. Doing this specifically on this page in case user 
 lands on the terms page directly, instead of being redirected here.
 *==============================================================================*/
function xonTermsLoad() {

   const debugMode = true;
   let _needsAnnualAgreement = false;
   let _needsInitialAgreement = false;
 
   _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetBylawsStatus";
 
   jQuery.ajax(_ajax, {
      type: "GET",
      contentType: "application/json",
      headers: {
         RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
      },
      success: function (data) {
         if (debugMode){
            console.log('Terms check:');
            console.log(data);
         }

         var record = data["Items"]["$values"][0]

         if (record != 'undefined') {

            //determine if user needs to sign
            if (record.Bylaws == 'Agree'){
                _needsInitialAgreement = false;
            } else {
                _needsInitialAgreement = true;
                if (debugMode) {
                    console.log('_needsInitialAgreement = true;')
                }
            }

            _needsAnnualAgreement = (record.Renewals == '' || record.Renewals == null) ? true : false;

         } else {
            //defaulting to needs annual because it's better to ask than miss someone
            console.log("Error-Status could not be retrieved.");
            _needsAnnualAgreement = true;
         }

         if  ((_needsInitialAgreement) || (_needsAnnualAgreement)) {
            getAgreement(_needsInitialAgreement);
         } 
    },//success
    error: function(xhr, status, error){
        console.log(`Error: Data retrieval in onTermsLoad(): ${xhr.responseText}`);
    }
   });
   //return {_needsInitialAgreement,_needsAnnualAgreement}
 }
 

 /*===============================================================================
 getAgreement(_needsInitial, _needsAnnual){
 Get content and render page
 *==============================================================================*/
 function xgetAgreement(_needsInitial) {
 
    //retrieve the content we need for the person's record type
    _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetBylawsContent&RecordType=" + _memberType;
 
    jQuery.ajax(_ajax, {
       type: "GET",
       contentType: "application/json",
       headers: {
          RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
       },
       success: function (data) {
          var record = data["Items"]["$values"][0]
          const _pageIntro = record.PageIntro;
          const _title = record.Title;
          const _message = htmlify(record.Message);
          const _prompt = record.Prompt;
          const _html = '<!-- container for message-->' +
            "<div id = 'bylaws-wrapper' class='xpopup-content'>" +
            "<div id='bylaws-title'>" +
            "<h1>" + _title + "</h1>" +
            "</div>" +
            "<div id='bylaws-intro'>" +  _pageIntro + "</div>" +
            "<div id='bylaws-message'>" + _message + "</div>" +
            "<div class='bylaws-initials-container'>" +
            "<input id='bylaws-initials' class='bylaws-initials' type='text' oninput='initialsChanged()' placeholder='"+  _prompt + "'><br><br>" +
            "<a id='bylaws-submit' href='javascript:submitBylaws(" + _needsInitial + ")' class='button disable-click'>I Agree</a>" +
            "</div>" +
            "</div>";
 
          const d1 = document.getElementById('BylawsContent');
          d1.insertAdjacentHTML('afterbegin', _html);
        },//success
        error: function(xhr, status, error){
            console.log(`Error: Data retrieval in getAgreement(): ${xhr.responseText}`);
        }
    });
 }
 /*===============================================================================
 getFiscalYear()
 *==============================================================================*/
 function getFiscalYear() {
    //determine Fiscal Year
    //note: EO FY is really more like a membership term and not a proper FY
    //we will need to adjust this logic once we begin processing renewals and joins
    //future note: members are extended a 3 month window on the bylaws
    //if they join after April, they pay 2 years worth of dues, so anyone joining in
    //that window will have a a FY which is one year greater than the current FY
    //right now we are simply adjusting FY to be adjusted properly after July
    //additional work will need to be done in this section once we process renewals
    var _fy = '';
    var d = new Date();
    var y = d.getFullYear();
    //if is April 1, or later, we need to advance calendar year by 1 to record proper FY
    //0=jan, so 3=April
    if (d.getMonth() >= 3) {
       y++;
    }
    _fy = (y.toString());
 
    return _fy;
 }

 /*===============================================================================
 submitBylaws(_needsInitial)
 *==============================================================================*/
 async function xsubmitBylaws(_needsInitial) {
    var _submittedDate = new Date();
    //adjust for EST timezone. Subtract 5 from UTC
    _submittedDate.setHours(_submittedDate.getHours() - 5);
    const _initials = jQuery("#bylaws-initials").val();
    const _fiscalYear = getFiscalYear();
    const _renewals = 'A'; // = _needsAnnualAgreement ? 'A' : '';
    const _bylaws = _needsInitial ? 'A' : '';
    const stringifiedData = JSON.stringify({
       "$type": "Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts",
       "EntityTypeName": "EO_BylawsRenewalAgreement",
       "PrimaryParentEntityTypeName": "Party",
       "Identity": {
          "$type": "Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts",
          "EntityTypeName": "EO_BylawsRenewalAgreement",
          "IdentityElements": {
             "$type": "System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib",
             "$values": [
                _selectedPartyId,
                "1"
             ]
          }
       },
       "PrimaryParentIdentity": {
          "$type": "Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts",
          "EntityTypeName": "Party",
          "IdentityElements": {
             "$type": "System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib",
             "$values": [
                _selectedPartyId
             ]
          }
       },
       "Properties": {
          "$type": "Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts",
          "$values": [{
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "ID",
                "Value": _selectedPartyId
             },
             {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Initials",
                "Value": _initials
             },
             {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Renewals",
                "Value": _renewals
             },
             {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Bylaws",
                "Value": _bylaws
             },
             {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "FiscalYear",
                "Value": _fiscalYear
             },
             {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Date",
                "Value": _submittedDate
             }
          ]
       }
    });
    _ajax = "https://" + window.location.hostname + "/api/EO_BylawsRenewalAgreement";
    await jQuery.ajax(_ajax, {
       type: "POST",
       contentType: "application/json",
       headers: {
          // this line retrieves the __RequestVerificationToken value that iMIS automatically populates onto the webpage, eliminating the need for separate authentication
          RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
       },
       "data": stringifiedData,
       success: function (data) {
          //console.log('post was successful');
          window.location.href = '/Shared_Content/Common/TermsConditionsSubmitted.aspx';
          /* this version returns member to _returnUrl instead of the Thank you page
            const _returnUrl = getUrlParameter("returnUrl");
            console.log('_returnUrl='+_returnUrl);
            console.log(window.location.hostname + _returnUrl);
            window.location.href = 'https://' + window.location.hostname + _returnUrl;
          */
       },
       error: function(xhr, status, error){
        console.log(`Error: POST operation in submitBylaws(): ${xhr.responseText}`);
       }
    });
    //close popup after successful save
    //closePopup();
 }

 /*===============================================================================
 closePopup()
 *==============================================================================*/
 function closePopup() {
    //jQuery("#form").hide();
    jQuery("#popup-overlay, #popup-content").fadeOut(400);
    //housekeeping-ensure the status msg is clear
    document.getElementById("popup-status").innerHTML = '';
 }


/*===============================================================================
changeRelationshipStatus(_id,_ordinal,_status,_gridId) 
change the status of a relationship in EO_Member_Relationships
*==============================================================================*/
async function changeRelationshipStatus(_id,_ordinal,_status,_gridId) {

    const debugMode = false;
    const _getURL = `https://${window.location.hostname}/api/EO_Member_Relationships?ID=${_id}&Ordinal=${_ordinal}`;
    const _putURL = `https://${window.location.hostname}/api/EO_Member_Relationships/~${_id}|${_ordinal}`;

    //declare variables here so they can
    //be used in all of the success blocks
    let getSuccess = false;
    let putSuccess = false;
    let _panelData = new Object();
    let _json = '';

    await jQuery.ajax(_getURL, {
        type: "GET",
        contentType: "application/json",
        headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
        success: function(_data){

            getSuccess = true;

            //exlcude unnecessary portion of JSON
            _panelData = _data.Items.$values[0];

            //update our fields with new values
            _panelData.Properties.$values[getFieldPosition('Status',_panelData)].Value = _status;

            refreshGrid(_gridId);

        },
        error: function(xhr, status, error){
            console.log(`changeRelationshipStatus() GET Error: ${xhr.responseText}`);
        }
    });////end panel GET


    if (!getSuccess){
        console.log('get failed');
        return;
    }

    if (debugMode){
        console.log(_panelData);
    }

    //call PUT to save new data
    await jQuery.ajax(_putURL, {
        type: "PUT",
        contentType: "application/json",
        headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
        data: JSON.stringify(_panelData),
        success: function(_putData) {
            putSuccess = true;
            ///location.reload()
        },
        error: function (xhr, status, error){
            alert(`We encountered an error trying to save this relationship.`);
            console.log(`changeRelationshipStatus() Error: ${xhr.responseText}`);
            console.log('_panelData')
            console.log(_panelData);
        }
    });/*end put */

    return true;
}

/*===============================================================================
refreshGrid()
rebind the specified grid to force a refresh for the user
*==============================================================================*/
function refreshGrid(_gridId) {
    let _grid = $find(jQuery('div[id$=' + _gridId+ ']').attr('id'));
    let _gridTable = _grid.get_masterTableView();
    _gridTable.rebind();
};


 /*===============================================================================
 getUrlParameter()
 *==============================================================================*/
 function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

 /*===============================================================================
 htmlify(s)
 we need to replace [] with <> so html will work
 we can't save html tags to iMIS any longer but this is an easy workaround
 *==============================================================================*/
 function htmlify(s) {
    //replace [ with <
    let _regex = /\[/g;
    s = s.replace(_regex, '<');
    //now replace ] with >
    _regex = /\]/g;
    s = s.replace(_regex, '>');
    return s
 }
 /*===============================================================================
 Event listener will call this whenever the value in the initials input changes
 Make submit button unclickable unless initials input box has value
 *==============================================================================*/
 function initialsChanged() {
    const _val = jQuery('#bylaws-initials').val();
    //console.log('val='+_val);
    if (_val != '' && jQuery('#bylaws-submit').hasClass('disable-click')) {
       jQuery('#bylaws-submit').removeClass('disable-click');
    } else if (_val == '' && !(jQuery('#bylaws-submit').hasClass('disable-click'))) {
       jQuery('#bylaws-submit').addClass('disable-click');
    }
 }  
    
    
    
    function setMyEOGroupChampion (_id, _ordinal){
        alert(_id + '  ' + _ordinal);
    }
    
    
    
    /*===============================================================================
    getMobilizeMemberPayload() 
    Call the IQA that contains the payload needed to transit member data to Mobilize
    *==============================================================================*/
    function getMobilizeMemberPayload(_id){
        let _ajax = decodeURIComponent("https://" + window.location.hostname + "/api/Query?QueryName=$/_eoREST/GetMobilizeMember&ID=" + _id);
    
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data) {
                //console.log(_data);
                //console.log('just Items');
                //console.log(_data.Items);
            },
            error: function(xhr, status, error){
                console.log(`getMobilizeMemberPayload() Error: ${xhr.responseText}`);
            }
        });     
    }
    
    
    
    /*===============================================================================
    getMobilizeInterests() 
    Call the IQA that contains the payload needed to transit member data to Mobilize
    *==============================================================================*/
    function getMobilizeInterests(_id){
    
        let _ajax = decodeURIComponent("https://" + window.location.hostname + "/api/Query?QueryName=$/_eoREST/GetMobilizeInterests&ID=" + _id);
    
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data) {
                let _firstName = _data.Items.$values[0].FirstName;
                let _lastName = _data.Items.$values[0].LastName;
                let _interests = new Array();
    
                for (let i=0; i<_data["TotalCount"]; i++){ 
                    _interests[i] = _data.Items.$values[i].Parent + '|' + _data.Items.$values[i].Interest;
                    //console.log(_data.Items.$values[i].Parent + '|' + _data.Items.$values[i].Interest);
                }
                let _obj = {ID: _id, FirstName: _firstName, LastName: _lastName, Interests: _interests};
                console.log('_obj');
                console.log(_obj);
                console.log(JSON.stringify(_obj));
    
            },
            error: function(xhr, status, error){
                console.log(`getMobilizeInterests() Error: ${xhr.responseText}`);
            }
        });     
    }
    
    
    /*===============================================================================
    getMobilizeSectors() 
    Call the IQA that contains the payload needed to transit member data to Mobilize
    *==============================================================================*/
    function getMobilizeSectors(_id){
    
        let _ajax = decodeURIComponent("https://" + window.location.hostname + "/api/Query?QueryName=$/_eoREST/GetMobilizeSectors&ID=" + _id);
    
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data) {
                let _firstName = _data.Items.$values[0].FirstName;
                let _lastName = _data.Items.$values[0].LastName;
                let _arr = new Array();
                console.log(_data["TotalCount"]);
                for (let i=0; i<_data["TotalCount"]; i++){ 
                    _arr[i] = _data.Items.$values[i].Parent + '|' + _data.Items.$values[i].Sector;
                    //console.log(_data.Items.$values[i].Parent + '|' + _data.Items.$values[i].Interest);
                }
                let _obj = {ID: _id, FirstName: _firstName, LastName: _lastName, Sectors: _arr};
    
                //console.log('_obj');
                //console.log(_obj);
                //console.log(JSON.stringify(_obj));
    
            },
            error: function(xhr, status, error){
                console.log(`getMobilizeSectors() Error: ${xhr.responseText}`);
            }
        });     
    }
    
    
    
    
    /*==========================================================================================================================
    FUNCTION:  deactivateGroup() 
    
    DESCRIPTION: Change the status of the group to "Deleted by Staff" and set the DeletedDate field.
    
    RELATED STOREY:
    
    USAGE: /EO_StaffSite/Staff-Dashboards/Community/EO-Groups.aspx
    
    NOTES:
    *==========================================================================================================================*/  
    
    function deactivateGroup(_id, _ordinal){
    
        const _getURL = `https://${window.location.hostname}/api/eo_GroupCreation?ID=${_id}&Ordinal=${_ordinal}`;
        const _putURL = `https://${window.location.hostname}/api/eo_GroupCreation/~${_id}|${_ordinal}`;
    
        jQuery.ajax(_getURL, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){
                //exlcude unnecessary portion of JSON
                let _panelData = _data.Items.$values[0];
                var d = new Date();
                //adjust for EST timezone. Subtract 5 from UTC
                d.setHours(d.getHours() - 5);
    
                console.log('_panelData');
                console.log(_panelData);
    
                //update our fields with new values
                _panelData.Properties.$values[getFieldPosition('Status',_panelData)].Value = 'Deleted by Staff';
                _panelData.Properties.$values[getFieldPosition('DeletedDate',_panelData)].Value = d;
                console.log('about to try PUT. payload below:');
                console.log(_putURL);
                console.log(JSON.stringify(_panelData));
                console.log(_panelData);
    
                //call PUT to save new data
                jQuery.ajax(_putURL, {
                    type: "PUT",
                    contentType: "application/json",
                    headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
                    data: JSON.stringify(_panelData),
                    success: function(_putData) {
                        console.log('PUT');
                        console.log(_putData);
                        alert('The group has been deleted.');
                        jQuery("#user-msg").html(`<b>Updated</b>`);
                        jQuery("#user-msg").css('background-color','#ccefdf');
                        location.reload();
                    },
                    error: function (xhr, status, error){
                        alert(`We encountered an error trying to delete this group.`);
                        jQuery("#user-msg").html(`Save Error`);
                        jQuery("#user-msg").css('background-color','#F1948A');
                        console.log(`deactivateGroup() PUT Error: ${xhr.responseText}`);
                        console.log('Attempted to save following object:');
                        console.log(_panelData);
                    }
                });/*end group details put */
            },///////end success
            error: function(xhr, status, error){
                console.log(`deactivateGroup() GET Error: ${xhr.responseText}`);
            }
        });////// end outer get 
       
    
    }


    /*===============================================================================
    assignCommitteeCode() 
    generate a unique value and assign it to committee code of new group
    *==============================================================================*/
    function assignCommitteeCode(_id, _ordinal){

        const debugMode =false;
    
        const _getURL = `https://${window.location.hostname}/api/eo_GroupCreation?ID=${_id}&Ordinal=${_ordinal}`;
        const _putURL = `https://${window.location.hostname}/api/eo_GroupCreation/~${_id}|${_ordinal}`;
        
        const _code = createCommitteeCode();

        jQuery.ajax(_getURL, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){
                //exclude unnecessary portion of JSON (upper and lower)
                let _panelData = _data.Items.$values[0];
                if (debugMode){
                    console.log('assignCommitteeCode() panel data:');
                    console.log(_panelData);
                }

                //update our object with new value
                _panelData.Properties.$values[getFieldPosition('CommitteeCode',_panelData)].Value = _code;

                if (debugMode){
                    console.log('about to try PUT. payload below:');
                    console.log(_putURL);
                    console.log(JSON.stringify(_panelData));
                    console.log(_panelData);
                }

                //call PUT to save new data
                jQuery.ajax(_putURL, {
                    type: "PUT",
                    contentType: "application/json",
                    headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
                    data: JSON.stringify(_panelData),
                    success: function(_putData) {
                        if (debugMode){
                            console.log('PUT Committee Updates-New Code');
                            console.log(_putData);
                        }
                    },
                    error: function (xhr, status, error){
                        alert(`We encountered an error trying to assign a CommitteeCode to this group.`);
                        jQuery("#user-msg").html(`Save Error`);
                        jQuery("#user-msg").css('background-color','#F1948A');
                        console.log(`assignCommitteeCode() PUT Error: ${xhr.responseText}`);
                        console.log('Attempted to save following object:');
                        console.log(_panelData);
                    }
                });/*end group details put */
            },///////end success
            error: function(xhr, status, error){
                console.log(`assignCommitteeCode() GET Error: ${xhr.responseText}`);
            }
        });////// end outer get 
    }


    /*===============================================================================
    createCommitteeCode() 
    Generate a new committee code
    *==============================================================================*/
    function createCommitteeCode() {
        return 'xxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }


    /*===============================================================================
    approveGroup() 
    for IQA to display approve,edit,delete buttons
    CASE WHEN [vBoEO_GroupCreation].[Status] <> 'Approved' AND [vBoEO_GroupCreation].[Status] NOT IN ('Deleted by Staff','Deleted by Member') THEN '<a class=''TextButton'' href=''javascript:ShowDialog_NoReturnValue("/iparts/Common/PanelEditor/PanelEditDialog.aspx?PanelDefinitionId=6693a4b5-4a99-439e-be26-43894cd0c900&AllowEdit=True&ID=' + [vBoEO_GroupCreation].[ID] + '&iKey=~' + [vBoEO_GroupCreation].[ID] + '|' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '&TemplateType=E",null,"600","800","Edit","","E",null,null,false,false,null,null)''>Edit</a>' + '&nbsp;&nbsp<a class=''TextButton'' href=''javascript:asyncApproveGroup("' + [vBoEO_GroupCreation].[ID] + '","' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '")''>Approve</a>' + '&nbsp;&nbsp<a class=''TextButton'' href=''javascript:deactivateGroup("' + [vBoEO_GroupCreation].[ID] + '","' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '")''>Delete</a>' WHEN [vBoEO_GroupCreation].[Status] = 'Approved' AND [vBoEO_GroupCreation].[Status] NOT IN ('Deleted by Staff','Deleted by Member') THEN '<a class=''TextButton'' href=''javascript:ShowDialog_NoReturnValue("/iparts/Common/PanelEditor/PanelEditDialog.aspx?PanelDefinitionId=6693a4b5-4a99-439e-be26-43894cd0c900&AllowEdit=True&ID=' + [vBoEO_GroupCreation].[ID] + '&iKey=~' + [vBoEO_GroupCreation].[ID] + '|' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '&TemplateType=E",null,"600","800","Edit","","E",null,null,false,false,null,null)''>Edit</a>' + '&nbsp;&nbsp<a class=''TextButton'' href=''javascript:deactivateGroup("' + [vBoEO_GroupCreation].[ID] + '","' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '")''>Delete</a>' WHEN [vBoEO_GroupCreation].[Status] <> 'Approved' AND [vBoEO_GroupCreation].[Status] IN ('Deleted by Staff','Deleted by Member') THEN '<a class=''TextButton'' href=''javascript:ShowDialog_NoReturnValue("/iparts/Common/PanelEditor/PanelEditDialog.aspx?PanelDefinitionId=6693a4b5-4a99-439e-be26-43894cd0c900&AllowEdit=True&ID=' + [vBoEO_GroupCreation].[ID] + '&iKey=~' + [vBoEO_GroupCreation].[ID] + '|' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '&TemplateType=E",null,"600","800","Edit","","E",null,null,false,false,null,null)''>Edit</a>' + '&nbsp;&nbsp<a class=''TextButton'' href=''javascript:asyncApproveGroup("' + [vBoEO_GroupCreation].[ID] + '","' + convert(varchar(10),[vBoEO_GroupCreation].[Ordinal]) + '")''>Approve</a>' END
    *==============================================================================*/
    async function approveGroup(_id, _ordinal){
    
        const debugMode = true;
        const _getURL = `https://${window.location.hostname}/api/eo_GroupCreation?ID=${_id}&Ordinal=${_ordinal}`;
        const _putURL = `https://${window.location.hostname}/api/eo_GroupCreation/~${_id}|${_ordinal}`;
    
        await jQuery.ajax(_getURL, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){
                //exlcude unnecessary portion of JSON
                let _panelData = _data.Items.$values[0];

                //first, let's try to create committee
                //if not successful, display msg and abort

                //if CommitteeCode is blank, let's generate a value
                let _committeeCode = _panelData.Properties.$values[getFieldPosition('CommitteeCode',_panelData)].Value;
                const _committeeName = _panelData.Properties.$values[getFieldPosition('GroupName',_panelData)].Value;
                const _Description = _panelData.Properties.$values[getFieldPosition('Description',_panelData)].Value;

                if (debugMode){
                     console.log('_committeeCode= '+_committeeCode);
                }
               
                if (_committeeCode.length == 0 || _committeeCode === ''){
                    //_committeeCode = _committeeName.substring(0,15).trim().replace(/\s+/g, '_');
                    _committeeCode = createCommitteeCode();
                    _committeeCode = ('33' + _committeeCode).substring(0,15);//so that we can identify committees assigned here
                    if (debugMode){
                        console.log('no _committeeCode, so just created=>'+_committeeCode);
                    } 
                }

                //formerly template literal, doing this to optimize minification
                _json = '{"$type": "Asi.Soa.Membership.DataContracts.GroupData, Asi.Contracts", ' +
                '"GroupCategory": "EO",' +
                '"GroupId": "COMMITTEE/' + _committeeCode +'",' +
                '"Name": "' + _committeeName+ '",' +
                '"Description": "' + _Description + '",' +
                '"ParentIdentity": {' +
                    '"$type": "Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts",' +
                    '"EntityTypeName": "Public",' +
                    '"IdentityElements": {' +
                    '"$type": "System.Collections.ObjectModel.Collection\`1[[System.String, mscorlib]], mscorlib",' +
                    '"$values": [' +
                        '"Public Groups"' +
                        ']' +
                    '}' +
                '},' +
                '"GroupClass": {' +
                '"$type": "Asi.Soa.Membership.DataContracts.GroupClassSummaryData, Asi.Contracts",' +
                    '"GroupClassId": "COMMITTEE",' +
                    '"Name": "Committee",' +
                    '"Description": ""' +
                '},' +
                '"StatusCode": "A"' +
                '}';
    
                if (debugMode){
                    console.log('json to create committee:');
                    console.log(_json);
                }

                //call POST to create new committee
                jQuery.ajax(`https://${window.location.hostname}/api/Group`, {
                    type: "POST",
                    contentType: "application/json",
                    headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
                    data: _json,//JSON.stringify(_json),
                    success: function(_postResponse) {
                        /////committee created success
                        if (debugMode){
                            console.log('The committee has been created.');
                            console.log(_postResponse);
                        }
                        jQuery("#user-msg").html(`<b>Saved</b>`);
                        jQuery("#user-msg").css('background-color','#ccefdf');
    
                        //////update the EO group system fields to indicate approval
                        var d = new Date();
                        //adjust for EST timezone. Subtract 5 from UTC
                        d.setHours(d.getHours() - 5);
    
                        //update our fields with new values
                        _panelData.Properties.$values[getFieldPosition('Status',_panelData)].Value = 'Approved';
                        _panelData.Properties.$values[getFieldPosition('ApprovedDate',_panelData)].Value = d;
                        //if (_panelData.Properties.$values[getFieldPosition('Proposer_ID',_panelData)].Value = '')
                        _panelData.Properties.$values[getFieldPosition('Proposer_ID',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('ID',_panelData)].Value;
                        _panelData.Properties.$values[getFieldPosition('Champion_ID',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('ID',_panelData)].Value;
                        _panelData.Properties.$values[getFieldPosition('Champion_Email',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_Email',_panelData)].Value;
                        _panelData.Properties.$values[getFieldPosition('Champion_FirstName',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_FirstName',_panelData)].Value;
                        _panelData.Properties.$values[getFieldPosition('Champion_LastName',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_LastName',_panelData)].Value;
                        
                        if (debugMode){
                            console.log('committee PUT payload below:');
                            console.log(_panelData);
                        }
    
                        //call PUT to save new data
                        jQuery.ajax(_putURL, {
                            type: "PUT",
                            contentType: "application/json",
                            headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
                            data: JSON.stringify(_panelData),
                            success: function(_putData) {
                                //call mojo so group can be created in mobilize
                               
                                    alert('about to call mojoGroup endpoint');
                                
                                jQuery.ajax(_mojoDomain + '/EoRealTimeDataSync?id=' + _committeeCode + '&operation=group', {
                                    type: "GET",
                                    success: function(response) {
                                       
                                            alert('mojo realtime Group success');
                                            console.log(response);
                                        
                                    },
                                    error: function (xhr, status, error){
                                        
                                            alert('mojo realtime Group error');
                                            console.log(status);
                                        
                                    }
                                });

                                alert('The group has been approved.');
                                jQuery("#user-msg").html(`<b>Saved</b>`);
                                jQuery("#user-msg").css('background-color','#ccefdf');
                                ///location.reload()
                            },
                            error: function (xhr, status, error){
                                alert(`We encountered an error trying to approve this group.`);
                                jQuery("#user-msg").html(`Save Error`);
                                jQuery("#user-msg").css('background-color','#F1948A');
                                console.log(`displayGroupDetails() Error: ${xhr.responseText}`);
                                console.log('_panelData')
                            }
                        });/*end group details put */
                        /////// end success process

                    },
                    error: function (xhr, status, error){
                        jQuery("#user-msg").html(`Committee Error`);
                        jQuery("#user-msg").css('background-color','#F1948A');
                        console.log(`Error encountered while creating the Committee: ${xhr.responseText}`);
                        console.log(_json);
    
                        const _obj = JSON.parse(xhr.responseText);
    
                        for(let i=0; i < _obj.Errors.$values.length; i++){
                            console.log('_obj.Errors.$values[i].Message');
                            console.log(_obj.Errors.$values[i].Message);
    
                            if (_obj.Errors.$values[i].Message ==  'Committee Id already exists.'){
                                alert("\n\nDuplicate Code: " + _committeeCode + "\nThe committee code that was proposed for this group already exists in iMIS. You will need to edit the group and assign a different committee code. Save changes then click Approve again.");
                            }
    
                            if (_obj.Errors.$values[i].Message == 'Committee name already exists.'){
                                alert("\nDuplicate Name: " + _committeeName + "\n\nThe name for this group already exists in iMIS. You will need to edit this group and assign a different name. Save changes then click Approve again.");
                            }
    
                            if (_obj.Errors.$values[i].Message == 'Committee id must end with a code.'){
                                alert("\nWarning: You must assign a valid Committee Code for this group.");
                            }
    
                            if (_obj.Errors.$values[i].Message == 'Committee description missing.'){
                                alert("\nWarning: Group description is missing.");
                            }
    
                        }
                    }
                });////// end committee post
            },
            error: function(xhr, status, error){
                console.log(`approveGroup() GET Error: ${xhr.responseText}`);
            }
        });////// end outer get 
    }
     



    /*===============================================================================
    asyncApproveGroup() 
    An alternative way to approve the group using an async () and await for each step
    *==============================================================================*/
    async function asyncApproveGroup(_id, _ordinal){
    
        const debugMode = true;
        const _getURL = `https://${window.location.hostname}/api/eo_GroupCreation?ID=${_id}&Ordinal=${_ordinal}`;
        const _putURL = `https://${window.location.hostname}/api/eo_GroupCreation/~${_id}|${_ordinal}`;
    
        //declare variables here so they can
        //be used in all of the success blocks
        let ajax1Success = false;
        let ajax2Success = false;
        let ajax3Success = false;
        let _panelData = new Object();
        let _json = '';
        let _committeeCode = '';
        let _committeeName = '';

        await jQuery.ajax(_getURL, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){

                ajax1Success = true;

                //exlcude unnecessary portion of JSON
                _panelData = _data.Items.$values[0];

                //first, let's try to create committee
                //if not successful, display msg and abort

                //if CommitteeCode is blank, let's generate a value
                _committeeCode = _panelData.Properties.$values[getFieldPosition('CommitteeCode',_panelData)].Value;
                _committeeName = _panelData.Properties.$values[getFieldPosition('GroupName',_panelData)].Value;
                const _Description = _panelData.Properties.$values[getFieldPosition('Description',_panelData)].Value;

                if (debugMode){
                     console.log('_committeeCode= '+_committeeCode);
                }
               
                if (_committeeCode.length == 0 || _committeeCode === ''){
                    //_committeeCode = _committeeName.substring(0,15).trim().replace(/\s+/g, '_');
                    _committeeCode = createCommitteeCode();
                    _committeeCode = ('33' + _committeeCode).substring(0,15);//so that we can identify committees assigned here
                    //we also need to update panelData with new committee code
                    _panelData.Properties.$values[getFieldPosition('CommitteeCode',_panelData)].Value = _committeeCode;

                    if (debugMode){
                        console.log('no _committeeCode, so just created=>'+_committeeCode);
                    } 
                }

                //formerly template literal, doing this to optimize minification
                _json = '{"$type": "Asi.Soa.Membership.DataContracts.GroupData, Asi.Contracts", ' +
                '"GroupCategory": "EO",' +
                '"GroupId": "COMMITTEE/' + _committeeCode +'",' +
                '"Name": "' + _committeeName+ '",' +
                '"Description": "' + _Description + '",' +
                '"ParentIdentity": {' +
                    '"$type": "Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts",' +
                    '"EntityTypeName": "Public",' +
                    '"IdentityElements": {' +
                    '"$type": "System.Collections.ObjectModel.Collection\`1[[System.String, mscorlib]], mscorlib",' +
                    '"$values": [' +
                        '"Public Groups"' +
                        ']' +
                    '}' +
                '},' +
                '"GroupClass": {' +
                '"$type": "Asi.Soa.Membership.DataContracts.GroupClassSummaryData, Asi.Contracts",' +
                    '"GroupClassId": "COMMITTEE",' +
                    '"Name": "Committee",' +
                    '"Description": ""' +
                '},' +
                '"StatusCode": "A"' +
                '}';
    

            },
            error: function(xhr, status, error){
                console.log(`approveGroup() GET Error: ${xhr.responseText}`);
            }
        });////end panel GET


        if (!ajax1Success){
            console.log('ajax1 failed');
            return;
        }

        if (debugMode){
            console.log('json to create committee:');
            console.log('Group Category......')
            console.log(_json);
            //alert(_json);
        }

        //call POST to create new committee
        await jQuery.ajax(`https://${window.location.hostname}/api/Group`, {
            type: "POST",
            contentType: "application/json",
            headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
            data: _json,//JSON.stringify(_json),
            success: function(_postResponse) {

                ajax2Success = true;

                /////committee created success
                if (debugMode){
                    console.log('The committee has been created.');
                    console.log(_postResponse);
                }
                jQuery("#user-msg").html(`<b>Saved</b>`);
                jQuery("#user-msg").css('background-color','#ccefdf');

                //////update the EO group system fields to indicate approval
                var d = new Date();
                //adjust for EST timezone. Subtract 5 from UTC
                d.setHours(d.getHours() - 5);

                //update our fields with new values
                _panelData.Properties.$values[getFieldPosition('Status',_panelData)].Value = 'Approved';
                _panelData.Properties.$values[getFieldPosition('ApprovedDate',_panelData)].Value = d;
                //if (_panelData.Properties.$values[getFieldPosition('Proposer_ID',_panelData)].Value = '')
                _panelData.Properties.$values[getFieldPosition('Proposer_ID',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('ID',_panelData)].Value;
                _panelData.Properties.$values[getFieldPosition('Champion_ID',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('ID',_panelData)].Value;
                _panelData.Properties.$values[getFieldPosition('Champion_Email',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_Email',_panelData)].Value;
                _panelData.Properties.$values[getFieldPosition('Champion_FirstName',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_FirstName',_panelData)].Value;
                _panelData.Properties.$values[getFieldPosition('Champion_LastName',_panelData)].Value = _panelData.Properties.$values[getFieldPosition('Proposer_LastName',_panelData)].Value;
            },
            error: function (xhr, status, error){
                jQuery("#user-msg").html(`Committee Error`);
                jQuery("#user-msg").css('background-color','#F1948A');
                console.log(`Error encountered while creating the Committee: ${xhr.responseText}`);
                console.log(_json);

                const _obj = JSON.parse(xhr.responseText);

                for(let i=0; i < _obj.Errors.$values.length; i++){
                    console.log('_obj.Errors.$values[i].Message');
                    console.log(_obj.Errors.$values[i].Message);

                    if (_obj.Errors.$values[i].Message ==  'Committee Id already exists.'){
                        alert("\n\nDuplicate Code: " + _committeeCode + "\nThe committee code that was proposed for this group already exists in iMIS. You will need to edit the group and assign a different committee code. Save changes then click Approve again.");
                    }

                    if (_obj.Errors.$values[i].Message == 'Committee name already exists.'){
                        alert("\nDuplicate Name: " + _committeeName + "\n\nThe name for this group already exists in iMIS. You will need to edit this group and assign a different name. Save changes then click Approve again.");
                    }

                    if (_obj.Errors.$values[i].Message == 'Committee id must end with a code.'){
                        alert("\nWarning: You must assign a valid Committee Code for this group.");
                    }

                    if (_obj.Errors.$values[i].Message == 'Committee description missing.'){
                        alert("\nWarning: Group description is missing.");
                    }

                }
            }
        });////// end committee post

        if (!ajax2Success){
            console.log('ajax2 failed');
            return;
        }

        if (debugMode){
            console.log('committee PUT payload below:');
            console.log(_panelData);
        }

        //call PUT to save new data
        await jQuery.ajax(_putURL, {
            type: "PUT",
            contentType: "application/json",
            headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
            data: JSON.stringify(_panelData),
            success: function(_putData) {
              
                ajax3Success = true;
                //alert('The group has been approved.');
                console.log('The group has been approved.')
                jQuery("#user-msg").html(`<b>Saved</b>`);
                jQuery("#user-msg").css('background-color','#ccefdf');
                ///location.reload()
            },
            error: function (xhr, status, error){
                alert(`We encountered an error trying to approve this group.`);
                //jQuery("#user-msg").html(`Save Error`);
                //jQuery("#user-msg").css('background-color','#F1948A');
                console.log(`displayGroupDetails() Error: ${xhr.responseText}`);
                console.log(_panelData);
            }
        });/*end group details put */

        if (!ajax3Success){
            console.log('ajax3 failed');
            return;
        }

        //call mojo so group can be created in mobilize
        await jQuery.ajax(_mojoDomain + '/EoRealTimeDataSync?id=' + _committeeCode + '&operation=group', {
            type: "GET",
            success: function(response) {
                console.log(response);
                alert('The group should now be visible in ConnectEO.');
            },
            error: function (xhr, status, error){
                console.log(status);
                alert('There was an error calling the real-time sync.');
                return;
            }
        });

    }



    
    /*===============================================================================
    prepareNewGroupForm() 
    prepare the new group form with default values
    *==============================================================================*/
    function prepareNewGroupForm() {

      /*  
        const _groupName = document.getElementById("ctl00_TemplateBody_PanelFieldEditor_EO_GroupCreation___GroupName");
        const _requirement = document.getElementById("ctl00_TemplateBody_PanelFieldEditor_EO_GroupCreation___GroupRequirement");
        
        _groupName.classList.add("singleLineTextArea");
        _requirement.classList.add("singleLineTextArea");
    
        const _elements = document.querySelectorAll(`[id*="__Group"]`);
        console.log(_elements);
        _elements.classList.add('myeoTextArea');
*/

        const _groupName = jQuery("input[type=text][id$='GroupName']");
        const _requirement = jQuery("input[type=text][id$='GroupRequirement']");

        _groupName.addClass("singleLineTextArea");
        _requirement.addClass("singleLineTextArea");


        //jQuery("id$=_")

        jQuery("[id$='EO_GroupCreation_GroupRequirement']").attr('placeholder','Example: Must be an EO member.');
        jQuery("label:contains('Chapter Scope')").nextAll('.PanelFieldValue:first').addClass('chapter-container');
    
        //default Status value
        jQuery("[id$='_Status']").val('Pending');
        jQuery("[id$='EO_GroupCreation_GroupSource']").val('Member');
        jQuery("[id$='O_GroupCreation_MobilizeGroupParent']").val('56849');
    
        
        //get ID, name and email of proposer
        let _id = JSON.parse(document.getElementById("__ClientContext").value).selectedPartyId;
    
        const _url = "https://" + window.location.hostname + "/api/Query?QueryName=$/_EORest/GetMemberById&ID=" + _id;
    
    
        //TODO: pass in a param from staff menu. if present, default proposer and champion to staff default value
    
        jQuery.ajax(_url, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data){
                console.log('_data');
                console.log(_data);
                jQuery("[id$='_Proposer_ID']").val(_data.Items.$values[0].ID);
                jQuery("[id$='_Proposer_FirstName']").val(_data.Items.$values[0].FirstName);
                jQuery("[id$='_Proposer_LastName']").val(_data.Items.$values[0].LastName);
                jQuery("[id$='_Proposer_Email']").val(_data.Items.$values[0].Email);
                jQuery("[id$='_Champion_ID']").val(_data.Items.$values[0].ID);
                jQuery("[id$='_Champion_FirstName']").val(_data.Items.$values[0].FirstName);
                jQuery("[id$='_Champion_LastName']").val(_data.Items.$values[0].LastName);
                jQuery("[id$='_Champion_Email']").val(_data.Items.$values[0].Email);
                jQuery("[id$='_CommitteeCode']").val(getGuid());
    
            },
            error: function(xhr, status, error){
                    alert(`Error retrieving GetMemberById for New EO Group Form:
                    ${xhr.responseText}`);
            }
        })
    }



    /*===============================================================================
    displayGroupDetails() 
    
    *==============================================================================*/
    function displayGroupDetails(_id, _ordinal){
    
    
    //clear user-msg in case it has a message from previous save
    jQuery("#user-msg").html('');
    jQuery("#user-msg").css('background-color','transparent');
    
    
    let _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_eoREST/GetGroupDetails&ID=" + _id + "&Ordinal=" + _ordinal;
    //<input type='text' id='GroupName' value='${_data["Items"]["$values"][0].GroupName.replace(/null/g,"")}'>
    
    jQuery.ajax(_ajax, {
        type: "GET",
        contentType: "application/json",
        headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
        success: function(_data) {
            console.log(_data);
            /*const _html =  `<div id='popup-overlay' class='popup-overlay'>
                                <div id = 'popup-content' class='popup-content'>
                                    <div class='popup-form'>
                                        <div class='col-xs-12'>
                                            <label for='GroupName'>Group Name</label>
                                            <input type='text' id='GroupName' value='${_data["Items"]["$values"][0].GroupName == null ? '' : _data["Items"]["$values"][0].GroupName}'>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupStatus'>Status</label>
                                            <select name='GroupStatus' id='GroupStatus'>
                                            </select>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupType'>Type</label>
                                            <select name='GroupType' id='GroupType'>
                                            </select>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupShortDescription'>Short Description</label>
                                            <textarea rows=2 id='GroupShortDescription'>${_data["Items"]["$values"][0].GroupShortDescription == null ? '' : _data["Items"]["$values"][0].GroupShortDescription}</textarea>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupLongDescription'>Long Description</label>
                                            <textarea rows=4 id='GroupLongDescription'>${_data["Items"]["$values"][0].GroupLongDescription == null ? '' : _data["Items"]["$values"][0].GroupLongDescription}</textarea>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupRequirement'>Group Requirement</label>
                                            <textarea rows=3 id='GroupRequirement'>${_data["Items"]["$values"][0].GroupRequirement == null ? '' : _data["Items"]["$values"][0].GroupRequirement}</textarea>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='GroupImage'>Group Image</label>
                                            <input type='text' id='GroupImage' value='${_data["Items"]["$values"][0].GroupImage == null ? '' : _data["Items"]["$values"][0].GroupImage}'>
                                        </div>
                                        <div class='col-xs-12'>
                                            <label for='InactiveDate'>Inactive Date</label>
                                            <input type='text' id='InactiveDate' value='${_data["Items"]["$values"][0].InactiveDate == null ? '' : getShortDate(_data["Items"]["$values"][0].InactiveDate)}'>
                                        </div>
                                    </div>
                                    <div class='submit-container text-right'>
                                        <a id='submit-popup' href='javascript:saveGroupDetails("${_id}", "${_ordinal}")' class='TextButton button xdisable-click'>Submit</a>
                                       &nbsp;&nbsp;
                                        <a id='cancel-popup' href='javascript:closePopup()' class='TextButton button'>Cancel</a>
                                        <br><span id='circuit-message'></span>
                                    </div>
                                </div>
                            </div>`;
            */
            const d1 = document.getElementById('MainBody');
            d1.insertAdjacentHTML('afterbegin', _html);
            
            //prepare our lookup lists
            //setLookupField(_iqa, _selectId, _selectedValue);
            //WAIT on these two
            setLookupField('EO_GROUP_STATUS', jQuery('#GroupStatus'), `${_data["Items"]["$values"][0].Status}`);
            setLookupField('GROUPTYPE', jQuery('#GroupType'), `${_data["Items"]["$values"][0].GroupType}`);
    
            jQuery( function() {
                jQuery("#InactiveDate").datepicker();
            });
    
    
            jQuery("#popup-overlay, #popup-content").addClass('active');
            jQuery("#popup-overlay, #popup-content").show();
        },
        error: function(xhr, status, error){
            console.log(`displayGroupDetails() Error: ${xhr.responseText}`);
            jQuery("#user-msg").html('Problem retrieving group details.');
            jQuery("#user-msg").css('background-color','#F1948A');
        }
    });
    }
    
    
    function closePopup() {
        //clear contents
        jQuery("#popup-overlay").remove();
        //hide popup
        jQuery("#popup-overlay, #popup-content").removeClass('active');
        jQuery("#popup-overlay, #popup-content").hide();
    }
    
    
    /*===============================================================================
    saveGroupDetails(_id, _ordinal, _data)
    save fields from  group popup
    *==============================================================================*/
    function saveGroupDetails(_id, _ordinal) {
    
    let _ajax = decodeURIComponent("https://" + window.location.hostname + "/api/eo_GroupCreation/~" + _id + "|" + _ordinal );
    
    //(this is the only format that works in postman)let _ajax = "https://" + window.location.hostname + "/api/eo_GroupCreation?ID=" + _id + "&Ordinal=" + _ordinal;
    console.log("saveGroupDetails(_id, _ordinal, _data)");
    console.log(_ajax);
    
    //get panel so we can update our fields
    jQuery.ajax(_ajax, {
        type: "GET",
        contentType: "application/json",
        headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
        success: function(_panelData) {
            console.log('GET panel data');
            console.log(_panelData);
    
            //update our fields with new values
            _panelData.Properties.$values[getFieldPosition('GroupName',_panelData)].Value = jQuery("#GroupName").val();
            _panelData.Properties.$values[getFieldPosition('Status',_panelData)].Value = jQuery("#GroupStatus").val();
            _panelData.Properties.$values[getFieldPosition('Description',_panelData)].Value = jQuery("#GroupLongDescription").val();
            _panelData.Properties.$values[getFieldPosition('GroupRequirement',_panelData)].Value = jQuery("#GroupRequirement").val();
            _panelData.Properties.$values[getFieldPosition('InactiveDate',_panelData)].Value = jQuery("#InactiveDate").val();
    
            console.log('about to try PUT. payload below:');
            console.log(JSON.stringify(_panelData));
    
            //call PUT to save new data
            jQuery.ajax(_ajax, {
                type: "PUT",
                contentType: "application/json",
                headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
                data: JSON.stringify(_panelData),
                success: function(_putData) {
                    console.log('PUT');
                    console.log(_putData);
                    jQuery("#user-msg").html(`<b>Saved</b>`);
                    jQuery("#user-msg").css('background-color','#ccefdf');
                },
                error: function (xhr, status, error){
                    jQuery("#user-msg").html(`Save Error`);
                    jQuery("#user-msg").css('background-color','#F1948A');
                    console.log('Attempted to save following object:');
                    console.log('_panelData')
                }
            });/*end PUT */
    
            //close popup
            closePopup();
            //REFRESH IQA USING ORIGINAL PARAMTERS
            jQuery("#ctl01_TemplateBody_WebPartManager1_gwpciNewQueryMenuCommon_ciNewQueryMenuCommon_ResultsGrid_Sheet0_SubmitButton").trigger("click");
    
    
        }, /*end success from GET */
        error: function(xhr, status, error){
            jQuery("#user-msg").html('Problem retrieving Group panel in saveGroupDetails().');
            jQuery("#user-msg").css('background-color','#F1948A');
        }
    });/*end GET  */
    }
    


    /*===============================================================================
    getSelectedId()
    attempt to get ID from mini profile editor
    if not present, assume we need SelectedPartyId
    *==============================================================================*/
    function getSelectedId (){
        let _id = '';

        //need to reference parentBody in case active window is an iframe
        const parentBody = window.parent.document.body

        if (jQuery("[id$='ciMiniProfile_contactStatus_memberId']", parentBody).length > 0) {
            _id = jQuery("[id$='ciMiniProfile_contactStatus_memberId']", parentBody).text();
        } else if (jQuery("[id$='Editor_CsContact.ID']",parentBody).length > 0) {
            _id = jQuery("[id$='Editor_CsContact.ID']", parentBody).text();
        } else if (jQuery("[id$='Editor_CsContact.ID']").length > 0) {
            _id = jQuery("[id$='Editor_CsContact.ID']").text();
        } else {
            _id = JSON.parse(jQuery("#__ClientContext").val()).selectedPartyId
        }

        return _id
    }


    /*===============================================================================
    mojoMemberDetails()
    call mojo endpoint to update member details in mobilize
    *==============================================================================*/
    async function mojoMemberDetails(){
        
        const debugMode = true;

        if (debugMode){
            console.log('mojoMemberDetails(). ID = ' + getSelectedId())
        }
    
        await jQuery.ajax( _mojoDomain + '/EoRealTimeDataSync?id=' + getSelectedId() + '&operation=memberDetail', {
            type: "GET",
            success: function(response) {
                console.log('mojoMemberDetails() success');
                console.log(response);
            },
            error: function (xhr, status, error){
                console.log('mojoMemberDetails() update failed');
                console.log(status);
            }
        });

    }


    /*===============================================================================
    mojoMemberIndustries()
    call mojo endpoint to update member details in mobilize
    *==============================================================================*/
   async function mojoMemberIndustries() {
        
    const debugMode = true;

    if (debugMode){
        console.log('mojoMemberIndustries(). ID = ' + getSelectedId())
    }

    await jQuery.ajax( _mojoDomain + '/EoRealTimeDataSync?id=' + getSelectedId() + '&operation=memberSector', {
        type: "GET",
        success: function(response) {
            console.log('mojo Industries');
            console.log(response);
        },
        error: function (xhr, status, error){
            console.log('mojo Industries error');
            console.log(status);
        }
    });

   }


    /*===============================================================================
    mojoMemberInterests()
    call mojo endpoint to update member interests in mobilize
    *==============================================================================*/
    async function mojoMemberInterests() {
        
        const debugMode = true;

        if (debugMode){
            console.log('mojoMemberInterests(). ID = ' + getSelectedId())
        }

        await jQuery.ajax( _mojoDomain + '/EoRealTimeDataSync?id=' + getSelectedId() + '&operation=memberInterest', {
            type: "GET",
            success: function(response) {
                console.log('mojo Interests');
                console.log(response);
            },
            error: function (xhr, status, error){
                console.log('mojo Interests error');
                console.log(status);
            }
        });

        if (debugMode){
            jQuery.ajax("https://" + window.location.hostname + "/api/Query?QueryName=$/_eoREST/GetMobilizeInterestsForId&ID=" + getSelectedId(), {
                type: "GET",
                contentType: "application/json",
                headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
                success: function(_data) {
                    console.log("Displaying interests for ID: " + getSelectedId());
                    console.log(_data);
                },
                error: function(xhr, status, error){
                    console.log('Error retrieving Interests for ID ' + getSelectedId() + ': ' + xhr.responseText);
                }
            });  
        }
   }


    /*===============================================================================
    mojoMemberHeadshot()
    call mojo endpoint to update member headshot in mobilize
    *==============================================================================*/
    async function mojoMemberHeadshot() {

        const debugMode = false;

        if (debugMode){
            console.log('mojoMemberHeadshot(). ID = ' + getSelectedId())
        }

        const _url = _mojoDomain + '/EoRealTimeDataSync?id=' + getSelectedId() + '&operation=memberHeadShot';

        await jQuery.ajax({
            "url": _url,
            "method": "GET",
            "timeout": 0,
        }).done(function (response) {
            console.log('mojo headshot');
            console.log(response);
        });
   }

    /*===============================================================================
    delay()
    delay before calling mojo endpoint to ensure they are retrieiving most recent save
    *==============================================================================*/
    function delay(time) {
        //return new Promise(resolve => setTimeout(resolve, time));
        console.log("starting delay promise");
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve("fast");
            console.log("promise is done");
          }, time);
        });

    }

    /*===============================================================================
    mojoGroup()
    call mojo endpoint to update group information in mobilize
    *==============================================================================*/
    function mojoGroup( _committeeCode ) {

        const _url = `${_mojoDomain}/EoRealTimeDataSync?id=${_committeeCode}&operation=group`;

        jQuery.ajax({
            "url": _url,
            "method": "GET",
            "timeout": 0,
        }).done(function (response) {
            console.log('mojo Group update');
            console.log(response);
        });
   }
    
    /*===============================================================================
    setLookupField(_iqa, _selectId)
    _iqa = full path of iqa
    _selectId = ID for the select element,
    _selectedValue = value of selected item
    Assumptions: iqa returns code, desc, and expansion.
    *==============================================================================*/
    function setLookupField(_tableName, _selectId, _selectedValue){
    
        let _ajax = decodeURIComponent("https://" + window.location.hostname + "/api/GenTable?TableName=" + _tableName);
    
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: {RequestVerificationToken: document.getElementById("__RequestVerificationToken").value},
            success: function(_data) {
                for(let i=0;i<_data.TotalCount;i++){
                    if (_selectedValue == _data["Items"]["$values"][i].Code){
                        jQuery(_selectId).append(`<option selected value='${_data["Items"]["$values"][i].Code}'>${_data["Items"]["$values"][i].Description}</option>`);
                    }else{
                        jQuery(_selectId).append(`<option value='${_data["Items"]["$values"][i].Code}'>${_data["Items"]["$values"][i].Description}</option>`);
                    }
                }
            },
            error: function(xhr, status, error){
                console.log(`setLookup() Error: ${xhr.responseText}`);
            }
        }); 
    }
    
    
    /*===============================================================================
    getFieldPosition(_fieldName, _data)
    
    *==============================================================================*/
    function getFieldPosition(_fieldName, _data){
        
        for (let i=0; i < _data["Properties"]["$values"].length; i++){
            //console.log(i);
            //console.log(_data["Properties"]["$values"][i].Name);
            if (_data["Properties"]["$values"][i].Name == _fieldName){
                return i;
            }
        }
    
        jQuery("#user-msg").html(`Group Update Error: Cannot locate ${_fieldName} in the panel.`);
        jQuery("#user-msg").css('background-color','#F1948A');
    }
        
    /*===============================================================================
    getShortDate(_datetime)
    
    *==============================================================================*/
    function getShortDate(_datetime){
    
        if (_datetime.isDate){
            return (_datetime.split('T')[0]);
        }
    }
    
    /*==========================================================================================================================
    COMPONENT:  displayLeaveDates()
    
    DESCRIPTION: REST call to determine leave dates for members who are on-leave. If dates are returned, display them on the on-leave 
    members's home page
    
    RELATED STOREY:
    
    USAGE: On-leave member's home page
    
    REVISION HISTORY:
    March 1, 2022 - Initial version of this code was approved and deployed. twalker
    *==========================================================================================================================*/   
    
    function displayLeaveDates() {
    
        let _ajax = "https://" + window.location.hostname + "/api/Query?QueryName=$/_eoRest/GetLeaveDates&ID=" + JSON.parse(document.getElementById("__ClientContext").value).selectedPartyId;
        jQuery.ajax(_ajax, {
            type: "GET",
            contentType: "application/json",
            headers: { RequestVerificationToken: document.getElementById("__RequestVerificationToken").value },
            success: function(_data) { 
                const _record = _data["Items"]["$values"][0];    
                //console.log(_record);
                if (_data["TotalCount"] > 0) {
                    jQuery("#leaveDates").html(`<p>Leave Start: ${_record.StartDate.split('T')[0]}<br>Leave End: ${_record.EndDate.split('T')[0]}</p>`);
                }      
            },
            error: function(xhr, status, error){
                console.log(`displayLeaveDates() Error: ${xhr.responseText}`);
            }
        });
    }
    
    /*==========================================================================================================================
    COMPONENT:  Industry & Interests
    
    DESCRIPTION: Develop a cascading lookup for Indusry>Sectors and Main Interests->Specific Interests
    
    RELATED STOREY:
    
    USAGE: Directory pages
    
    REVISION HISTORY:
    AUGUST 2021 - Initial version of this code base approved for deployment. twalker
    *==========================================================================================================================*/   
    
    
    /*==================================================================
      resetFields()
      defaults all input fields and selects to defaul value
    ==================================================================*/
    
    function resetEoFields(){
        jQuery("input[type=text]").val("");
        jQuery("input[type=text]").trigger('change');
        jQuery("select").prop("selectedIndex",0);
        jQuery("select").trigger('change');
    }
    
    
    /*==================================================================
      CreateSectorListList()
      Create Sector Select List
    ==================================================================*/
    function CreateSectorList(){
    
        (function($){
    
            //target select list where label is 'Sector'
            var _select = $('<select>').appendTo( $("label:contains('Sector')").parent() )
    
            _select.attr('id','SectorList');
    
            //add event listener so when item is selected in list we will update the iqa filter input field
           document.getElementById('SectorList').addEventListener('change', (event) => { 
                var s = event.target.value;
                if (s != "") {
                    sectorChanged(s);
                }
            });
    
            //populate our list based on value of parent
            updateSectorList( $("label:contains('Industry')").parent().find("select").val() );
           
        })(jQuery);
    }
    
    
    /*==================================================================
      CreateInterestListList()
      Create Select List for Specific Interest
    ==================================================================*/
    function CreateInterestList(){
    
        (function($){
    
            //target select list where label is 'Specific Interest'
            var _select = $('<select>').appendTo( $("label:contains('Specific Interest')").parent() )
    
            //assign ID to _select
            _select.attr('id','InterestList');
    
            //add event listener so when item is selected in list we will update the iqa filter input field
            document.getElementById('InterestList').addEventListener('change', (event) => { 
                var s = event.target.value;
                //always refresh even if parent is blank, january 2022, if (s != "") {
                    interestChanged(s);
                //}
            });
    
            //populate our list based on value of parent in Industry Category list
            updateInterestList( $("label:contains('Interest Category')").parent().find("select").val() );
            
        })(jQuery);
    
    }
    
    /*==================================================================
      addIndustryListener()
      When industry (parent) select changes, refresh Sector (child) list.
    ==================================================================*/
    function addIndustryListener(){
        const debugMode = false;

        (function ($) {
    
            let _IndustrySelect = $("label:contains('Industry')").parent().find("select");

            if (debugMode){
                if (_IndustrySelect){
                    console.log('found _IndustrySelect');
                } else {
                    console.log('didnt find _IndustrySelect');
                }
                
            }

            if (_IndustrySelect) {
                _IndustrySelect.on('change', (event) => {
                    updateSectorList( event.target.value );
                    //console.log("IndustrySelect="+event.target.value);
            });
    
            /* old js, keeping as reference 
            getElementById.addEventListener('change', (event) => {
                var s = event.target.value;
                if (s != "") {
                    updateSectorList(s);
                }
            });*/
        }
        })(jQuery);
    }
    
    /*==================================================================
      addInterestCategoryListener()
      When interest category select changes, refresh specific interests list.
    ==================================================================*/
    function addInterestCategoryListener(){
        (function ($) {
            let _parentSelect = $("label:contains('Interest Category')").parent().find("select");
    
            if (_parentSelect) {
    
                _parentSelect.on('change', (event) => {
                    updateInterestList(event.target.value);
                    //console.log("Parent Select="+event.target.value);
                });
            }
        })(jQuery);
    }
    
    
    /*==================================================================
      sectorChanged()
      When updated, refresh hidden IQA filter field
    ==================================================================*/
    function sectorChanged(s){
        jQuery("label:contains('Sector')").parent().find("input").val(s);
    }
    
    /*==================================================================
      interestChanged()
      When updated, refresh hidden IQA filter field
    ==================================================================*/
    function interestChanged(s){
        jQuery("label:contains('Specific Interest')").parent().find("input").val(s);
    }
    
    
    /*==================================================================
      updateSectorList()
    
    ==================================================================*/
    function updateSectorList(s) {
    
        //reset sector text filter field
        jQuery.ajax(JSON.parse(jQuery("#__ClientContext").val()).baseUrl + "api/iqa?queryname=" + iqaSectorLookup + "&parameter=" + s, {
            type: "GET",
            contentType: "application/json",
            headers: {
                RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
            },
            success: function(data) {
                
                //get reference to the Sector list
                const _select = jQuery("[id='SectorList']");
                var _code;
                var _desc;
    
                //remove previous values
                _select.children().remove().end();
    
                //add new values from ajax call
                _select.append(jQuery("<option>").attr('value','').text('(Any)'));
                for (i = 0; i < data.TotalCount; i++) {
                    _code = data["Items"]["$values"][i]["Properties"]["$values"][1]["Value"];
                    _desc = data["Items"]["$values"][i]["Properties"]["$values"][2]["Value"];
                    _select.append(jQuery("<option>").attr('value',_code).text(_desc));
                }
    
                /*---------------------------------------------------
                if we just returned from a user search (partial postback),
                make sure the selected item in List matches what the user clicked before the search
                --------------------------------------------------- */
                var _hiddenField = jQuery("label:contains('Sector')").nextAll().eq(0).find('input');
    
                //if _hiddenField has a value from a previous search, let's try to find it in the list and select it
                if (_hiddenField.val() != ''){
                    
                    jQuery("[id='SectorList'] option[value=" + _hiddenField.val() + "]").prop('selected',true);
                    //if _hiddenField.val()  wasn't found, we need to blank out _hiddenField
                    //console.log("_select.val()="+_select.val());
                    if (_select.val() == '') {
                        jQuery(_hiddenField).val('');
                    }
                }
            },
            error: function(xhr, status, error){
                console.log(`updateSectorList() Error: ${xhr.responseText}`);
            }
        });
    }
    
    /*==================================================================
      updateInterestList()
      called after change on our parent list (main hobby)
      Refresh the select, and reset the hidden IQA field that is populated
      from this list
    ==================================================================*/
    function updateInterestList(s) {
    
        //reset interest text filter field
        jQuery.ajax(JSON.parse(jQuery("#__ClientContext").val()).baseUrl + "api/iqa?queryname=" +iqaInterestLookup + "&parameter=" + s + '&limit=500', {
            type: "GET",
            contentType: "application/json",
            headers: {
                RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
            },
            success: function(data) {
                
                //get reference to the list
                const _select = jQuery("[id='InterestList']");
                var _code;
                var _desc;
    
                //remove previous values
                _select.children().remove().end();
    
                //add new values from ajax call
                _select.append(jQuery("<option>").attr('value','').text('(Any)'));
                for (i = 0; i < data.TotalCount; i++) {
                    _code = data["Items"]["$values"][i]["Properties"]["$values"][1]["Value"];
                    _desc = data["Items"]["$values"][i]["Properties"]["$values"][2]["Value"];
                    _select.append(jQuery("<option>").attr('value',_code).text(_desc));
                }
    
                /*---------------------------------------------------
                if we just returned from a user search (partial postback),
                make sure the selected item in List matches what the user clicked before the search
                --------------------------------------------------- */
                var _hiddenField = jQuery("label:contains('Specific Interest')").nextAll().eq(0).find('input');
    
                //if _hiddenField has a value from a previous search, let's try to find it in the list and select it
                if (_hiddenField.val() != ''){
                    
                    jQuery("[id='InterestList'] option[value=" + _hiddenField.val() + "]").prop('selected',true);
                    //if _hiddenField.val()  wasn't found, we need to blank out _hiddenField
                    //console.log("_select.val()="+_select.val());
                    if (_select.val() == '') {
                        jQuery(_hiddenField).val('');
                    }
                    // old jQuery("[id='InterestList']").val( _hiddenField );
                    /* keeping just as reference to show how to iterate options if needed for anything else
                    jQuery("[id='InterestList'] > option").each(function() {
                        if (this.text == _hiddenField){
                            this.prop('selected', true)
                            alert(this.text + ' ' + this.value);
                        }
                    });
                    */
                }
            },
            error: function(xhr, status, error){
                console.log(`updateInterestsList() Error: ${xhr.responseText}`);
            }
        });
    }
    
    
    
    /*==================================================================
      HideSectorIQAField()
      Hide the IQA sector filter fields. We will use our own select list to
      collect this value. Then we will pass the values from our list
      into the hidden sector field.
    ==================================================================*/
    function HideSectorIQAField(){
    
        (function($){
            //hide Sub Sector and default to blank
            $("label:contains('Sector')").parent().find("input").hide();
        })(jQuery);
    
    }
    
    /*==================================================================
      HideInterestIQAField()
      Hide the IQA interest filter fields. We will use our own select list to
      collect this value. Then we will pass the values from our list
      into the hidden sector field.
      todo: get reference to item 
    ==================================================================*/
    function HideInterestIQAField(){
    
        (function($){
            //hide Sub Sector and default to blank
            $("label:contains('Specific Interest')").parent().find("input").hide();
        })(jQuery);
    
    }
    
    
    /*==========================================================================================================================
    COMPONENT:  Headshots
    
    DESCRIPTION: Retrieve member headshots by imis ID and replace the placeholder in the markup. 
    
    RELATED STOREY: 11444
    
    USAGE: Directory pages
    
    REVISION HISTORY:
    December 2021 - Initial version of this code base approved for deployment. twalker
    *==========================================================================================================================*/   
    
    function getHeadshot(_div, _id){
    
        const apiURL = "https://" + window.location.hostname + "/api/Query?QueryName=$/_eoRest/GetHeadshot&ID=" + _id;
        // make ajax call to API to retrieve names
        jQuery.ajax(apiURL, {
            type: "GET",
            contentType: "application/json",
            headers: {
                // this line retrieves the __RequestVerificationToken value that iMIS automatically populates onto the webpage, eliminating the need for separate authentication
                RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
            },
            success: function(data) { 
                const _record = data["Items"]["$values"][0];    
                // shows picture size console.log(_record.PICTURE_LOGO.$value);
                //data["Items"]["$values"][0].PICTURE_LOGO.$value                                        
                // display results if any were found
                if (data["TotalCount"] > 0 && _record.PICTURE_LOGO.$value != null) {
                    //jQuery(`"#${_id} img"`).src = "data:image/png;base64," + data["Items"]["$values"][0].PICTURE_LOGO.$value;
                    var _img = jQuery(_div); //jQuery(_div img)
                    jQuery(_img).src = "data:image/png;base64," + _record.PICTURE_LOGO.$value;
                    //alert(_id);
    
                    const _image = new Image();
                    _image.classList.add('headshot');
                    _image.classList.add('responsive');
    
                    //get image, or set to default image file
                    if (_record.PICTURE_LOGO != null) {
                        _image.src = "data:image/png;base64," + _record.PICTURE_LOGO.$value;
                    } else {
                        _image.src = '/images/EO%20Logo/eo_logo-directory.png'
                    }
    
                    const _divImage = document.createElement("div");
                    _divImage.classList.add('col-md-3');
                    _divImage.classList.add('col-sm-12');
                    _divImage.classList.add('headshot-div');
                    _divImage.appendChild(_image); 
                    //jQuery(_img).hide();
                    _div.hide();
                    jQuery(_div).after(_divImage);
    
                }      
                },
            error: function(xhr, status, error){
                console.log(`getHeadshot() Error: ${xhr.responseText}`);
            }
        });
    }
    

    /*==========================================================================================================================
    COMPONENT:  Sectors & Industries
    
    DESCRIPTION: Check to see if Panels are being used to capture Sector and Industry data. If so, add listener to parent item. 
    Every time user selects new parent item, call updateSecors() or updateInterests() to update the children list. We only 
    want to display children related to the parent.
    
    RELATED STOREY:
    
    USAGE: IMIS Panels with Interests or Industries
    
    REVISION HISTORY:
  
    *==========================================================================================================================*/   

    document.addEventListener('DOMContentLoaded', function() {
        var selected = document.getElementById("ctl00_TemplateBody_PanelFieldEditor_EO_Industries___MainIndustry");
        if (selected) {
            jQuery("#ctl00_TemplateBody_PanelFieldEditor_EO_Industries___Sector").css({
                "width": "100%",
                "border": "0px"
            });
            var checks = jQuery("input[id*='EO_Industries___Sector_']");
            jQuery.each(checks, function(x,y){
                var id = jQuery(this).prop("id");
                jQuery("input[id=" + id + "]").hide();
                jQuery("label[for=" + id + "]").next().hide();
                jQuery("label[for=" + id + "]").hide();
            });
            if (jQuery(selected).val() != "") {
                var s = jQuery(selected).val();
                updateSectors(s);
            }
            selected.addEventListener('change', (event) => {
                jQuery.each(checks, function(x,y){
                    var id = jQuery(this).prop("id");
                    jQuery("input[id=" + id + "]").hide().prop("checked", false);
                    jQuery("label[for=" + id + "]").next().hide();
                    jQuery("label[for=" + id + "]").hide();
                });			
                var s = event.target.value;
                if (s != "") {
                    updateSectors(s);
                }
            });
        }
    }, false);

    document.addEventListener('DOMContentLoaded', function() {
        var selected = document.getElementById("ctl00_TemplateBody_PanelFieldEditor_EO_Interests___MainInterest");
        if (selected) {
            jQuery("#ctl00_TemplateBody_PanelFieldEditor_EO_Interests___Interest").css({
                "width": "100%",
                "border": "0px"
            });
            var checks = jQuery("input[id*='EO_Interests___Interest_']");
            jQuery.each(checks, function(x,y){
                var id = jQuery(this).prop("id");
                jQuery("input[id=" + id + "]").hide();
                jQuery("label[for=" + id + "]").next().hide();
                jQuery("label[for=" + id + "]").hide();
            });
            if (jQuery(selected).val() != "") {
                var s = jQuery(selected).val();
                updateInterests(s);
            }
            selected.addEventListener('change', (event) => {
                jQuery.each(checks, function(x,y){
                    var id = jQuery(this).prop("id");
                    jQuery("input[id=" + id + "]").hide().prop("checked", false);
                    jQuery("label[for=" + id + "]").next().hide();
                    jQuery("label[for=" + id + "]").hide();
                });			
                var s = event.target.value;
                if (s != "") {
                    updateInterests(s);
                }
            });
        }
    }, false);

    function updateSectors(s) {
        var checks = jQuery("input[id*='EO_Industries___Sector_']");
        jQuery.ajax(JSON.parse(jQuery("#__ClientContext").val()).baseUrl + "api/iqa?queryname=$/EORest/GetSectors&parameter=" + s, {
            type: "GET",
            contentType: "application/json",
            headers: {
                RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
            },
            success: function(data) {
                var arr = [];
                for (i = 0; i < data.TotalCount; i++) {
                    arr.push(data["Items"]["$values"][i]["Properties"]["$values"][1]["Value"]);
                }
                for (j = 0; j < arr.length; j++) {
                    jQuery.each(checks, function(x,y){
                        var check = jQuery(y).val();
                        if (check == arr[j]) {
                            var id = jQuery(this).prop("id");
                            jQuery("input[id=" + id + "]").show();
                            jQuery("label[for=" + id + "]").next().show();
                            jQuery("label[for=" + id + "]").show();
                        }
                    });
                }
            },
            error: function(xhr, status, error){
                console.log(`updateSectors() Error: ${xhr.responseText}`);
            }
        });
    }

    function updateInterests(s) {
        var checks = jQuery("input[id*='EO_Interests___Interest_']");
        //console.log('checks...');
        //console.log(checks);
        jQuery.ajax(JSON.parse(jQuery("#__ClientContext").val()).baseUrl + "api/iqa?queryname=$/EORest/GetInterests&parameter=" + s, {
            type: "GET",
            contentType: "application/json",
            headers: {
                RequestVerificationToken: document.getElementById("__RequestVerificationToken").value
            },
            success: function(data) {
                var arr = [];
                for (i = 0; i < data.TotalCount; i++) {
                    arr.push(data["Items"]["$values"][i]["Properties"]["$values"][1]["Value"]);
                }
                for (j = 0; j < arr.length; j++) {
                    jQuery.each(checks, function(x,y){
                        var check = jQuery(y).val();
                        if (check == arr[j]) {
                            var id = jQuery(this).prop("id");
                            jQuery("input[id=" + id + "]").show();
                            jQuery("label[for=" + id + "]").next().show();
                            jQuery("label[for=" + id + "]").show();
                        }
                    });
                }
            },
            error: function(xhr, status, error){
                console.log(`updateInterests() Error: ${xhr.responseText}`);
            }
        });
    }


    /*==========================================================================================================================
    COMPONENT: MegaMenu
    
    DESCRIPTION: Construct the MegaMenu. Available items depend on whether user is authenticated.
    
    RELATED STOREY:
    
    USAGE: 
    
    REVISION HISTORY:
    8/19/2022, update signin and home page links to make GA-friendly
    
    *==========================================================================================================================*/       

    function createMegaMenu() {
        var isAuthenticated = false;
        var clientContext = JSON.parse(jQuery("#__ClientContext").val());
        if (clientContext.isAnonymous == false) {
            isAuthenticated = true;
        }
    
    
        // Apply Rules for Authenticated user
        if (isAuthenticated) {
            //show search
            jQuery(".UtilitySearch").css("visibility", "visible");
            //show member dropdown
            jQuery("li.member-dropdown").removeClass("hide");
            //remove href for top level nav
            //jQuery(".rmRootGroup > .rmItem > .rmLink").attr("href","#");
            jQuery(".eo-remove-href").attr("href", "#");
        } else {
            //Hidesearch
            jQuery(".searchbar-toggle").hide();
        }
    
    
    
        var menuItem = [];
        if (isAuthenticated) {
            /**   AUTHENTICATED   **/
            menuItem = [{
                    "parent": "Contribute",
                    "href": "#",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Become a member leader",
                            "href": "https://pol.eonetwork.org "
                        },
                        {
                            "parent": "#EOImpact",
                            "href": "/web/Web/About%20Public/EO-Impact.aspx"
                        },
                        {
                            "parent": "PressPass",
                            "href": "https://www.eonetwork.org/member/member-benefits/eo-presspass/"
                        },
                        {
                            "parent": "Write for EO's blog",
                            "href": "/web/Web/Donations/Contribute-to-Octane.aspx"
                        }
                    ]
                },
                {
                    "parent": "For member leaders",
                    "href": "#",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Brand portal",
                            "href": "https://brand.eonetwork.org"
                        },
                        {
                            "parent": "Dashboards",
                            "href": "https://dashboards.eonetwork.org"
                        },
                        {
                            "parent": "Transformation toolkit",
                            "href": "https://brand.eonetwork.org/transformation-toolkit/"
                        },
                        {
                            "parent": "Organizational playbook ",
                            "href": "https://samepage.io/app/#!/0ac35366228c17a2e4154d583fed5888df1c62a1/team-8ab69cea3afb5375c2240e08c0af4c123b8eecb6/folder-645339214198929597"
                        },
                        {
                            "parent": "Member success",
                            "href": "https://www.eonetwork.org/member/resources/member-success"
                        },
                        {
                            "parent": "Structured chapter growth",
                            "href": "https://www.eonetwork.org/member/resources/growth-gives"
                        }
                    ]
                },
                {
                    "parent": "For chapter officers",
                    "href": "#",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Transformation toolkit",
                            "href": "https://brand.eonetwork.org/transformation-toolkit/"
                        },
                        {
                            "parent": "EO logo usage",
                            "href": "https://brand.eonetwork.org/logo"
                        },
                        {
                            "parent": "Chapter logos",
                            "href": "https://www.eonetwork.org/member/resources/communication-resources"
                        },
                        {
                            "parent": "Swag guidelines",
                            "href": "https://brand.eonetwork.org/swag-guidelines/"
                        },
                        {
                            "parent": "Forum meeting resources",
                            "href": "/Web/Forum/Members-and-Moderators/Web/Forum/Members-and-Moderators.aspx"
                        },
                        {
                            "parent": "Officer resources",
                            "href": "/web/Web/COT/Chapter-Officer-Resources.aspx"
                        },
                        {
                            "parent": "Chapter site administration",
                            "href": "https://www.eonetwork.org/member/administration/site-administration/"
                        }
                    ]
                },
                {
                    "parent": "Spouses and life partners",
                    "href": "#",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "SLP Forums",
                            "href": "https://www.eonetwork.org/member/one-forum-framework-slp?forumtype=SLP"
                        },
                        {
                            "parent": "SLP Facebook group",
                            "href": "https://www.facebook.com/groups/EOSpouses"
                        }
                    ]
                },
                {
                    "parent": "Other EO sites",
                    "href": "#",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Accelerator programme",
                            "href": "/Web/web/Accelerator/Accelerator-Home.aspx"
                        },
                        {
                            "parent": "Global student entrepreneur awards",
                            "href": "https://gsea.org/"
                        },
                        {
                            "parent": "MyEO Deal Exchange",
                            "href": "http://myeodealexchange.com/"
                        }
                    ]
                }
            ]
        } else {
            /**   UNAUTHENTICATED   **/
            menuItem = [{
                    "parent": "Home",
                    "href": "/",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Home",
                            "href": "/",
                        },
                        {
                            "parent": "About",
                            "href": "/web/Web/About%20Public/About.aspx"
                        },
                        {
                            "parent": "Why Join",
                            "href": "/web/Web/Why-Join/The-EO-Experience.aspx" /**** go-live change */
                        },
                        {
                            "parent": "Find an EO chapter",
                            "href": "https://www.eonetwork.org/about/chapter-locations/"
                        },
                        {
                            "parent": "EO Board",
                            "href": "/Web/Web/About%20Public/EO-Board.aspx"
                        },
                        {
                            "parent": "Careers",
                            "href": "https://www.eonetwork.org/contact-us/careers/"
                        },
                        {
                            "parent": "Apply for membership",
                            "href": "/web/Web/Why-Join/Why-Join-Homepage.aspx"
                        }
                    ]
                },
                {
                    "parent": "Engage with us",
                    "href": "https://www.eonetwork.org/contact-us/",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "The EO blog",
                            "href": "https://blog.eonetwork.org/"
                        },
                        {
                            "parent": "EO on Inc.com ",
                            "href": "https://www.inc.com/author/entrepreneurs-organization"
                        },
                        {
                            "parent": "EO podcasts",
                            "href": "https://eopodcasts.org "
                        },
                        {
                            "parent": "#EOImpact",
                            "href": "/web/Web/About%20Public/EO-Impact.aspx"
                        },
                        {
                            "parent": "Subscribe",
                            "href": "https://www.eonetwork.org/Pages/contact-us/subscribe.aspx "
                        }
                    ]
                },
                {
                    "parent": "Global student entrepreneur awards",
                    "href": "https://gsea.org/",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "About GSEA",
                            "href": "https://gsea.org/about/"
                        },
                        {
                            "parent": "Competitions",
                            "href": "https://gsea.org/who-is-eligible/"
                        },
                        {
                            "parent": "Global champions",
                            "href": "https://gsea.org/global-champions/"
                        },
                        {
                            "parent": "Global finals",
                            "href": "https://gsea.org/meet-the-global-finalists-2019-20/"
                        },
                        {
                            "parent": "News media",
                            "href": "https://gsea.org/news-media/"
                        }
                    ]
                },
                {
                    "parent": "Accelerator programme",
                    "href": "/web/web/Accelerator/Accelerator-Home.aspx",
                    "children": [{
                            "parent": "Back",
                            "href": "#"
                        },
                        {
                            "parent": "Accelerator programme",
                            "href": "/web/web/Accelerator/Accelerator-Home.aspx"
                        },
                        {
                            "parent": "Curriculum",
                            "href": "/web/web/Accelerator/Accelerator-Curriculum.aspx"
                        },
                        {
                            "parent": "Graduate spotlight",
                            "href": "/web/web/Accelerator/Graduate-Spotlight.aspx"
                        },
                        {
                            "parent": "Accelerator FAQ",
                            "href": "/web/web/Accelerator/Accelerator-FAQ.aspx"
                        },
                        {
                            "parent": "Accelerator application",
                            "href": "/web/Web/Accelerator/Apply-for-EO-Accelerator.aspx"
                        }
                    ]
                },
                {
                    "parent": "Member login",
                    "href": "/Web/EOSignIn.aspx",
                    "children": []
                }
            ]
        }
    
    
        generateMenues(menuItem);
    
        //open and close megaMenu
        jQuery('li.mega-menu').on('click', function() {
            jQuery('body').addClass('OpnMMSlide');
        });
        jQuery('.mmslideNavClose').on('click', function() {
            jQuery('body').removeClass('OpnMMSlide');
        });
    
        //open and close mobile SubmegaMenu
        jQuery('.mobMMarw').on('click', function() {
            jQuery(this).parents('.mmsub-pr').addClass('openSubMMnav');
        });
        jQuery('.mmSubSlideBack').on('click', function() {
            jQuery('body').find('.mmsub-pr').removeClass('openSubMMnav');
        });
    
    }


    function generateMenues(menuItem) {
        var menusHtml = '<div style="visibility: hidden" class="megaMenuBox">'
        +'<div class="/*header-top-container*/ megaMenuhd">'
        +'<div class="/*header-logo-container pull-left*/ row noindex">'
        +'<a href="#" class="mm-logo"><img src="https://brand.eonetwork.org/wp-content/themes/eo-2020-child/library/images/EO_Main_Logo.png" width="251" alt="entrepreneurs" ></a>'
        +'<div class="mmslideNavClose"></div>'
        +'</div>'
        +'</div>'
        +'<div class="megaMenuhdStrip">'
        +'<div class="row noindex"><h4>EO Network</h4></div>'
        +'</div>'
        +'<div class="megaMenuhdNav">'
        +'<div class="row noindex" id="megaMenu">';
    
        /*begin fixed vkg code*/
        for(var x=0;x<menuItem.length;x++){
            menusHtml += '<div class="col-sm-12 col-md-6 text-center mmsub-pr"> <h3 class="mmsubtitle"><a href='+menuItem[x].href+' class="mobMMarw">'
            menusHtml +=menuItem[x].parent+'</a><span class="mobMMarw"></span></h3>';
        
            if(menuItem[x].children && menuItem[x].children.length > 0) {
                menusHtml += '<ul>';
                for(var c=0;c<menuItem[x].children.length;c++){
                    if(c==0) {
                        menusHtml += `<li class="mmSubSlideBack"><a href="javascript:void(0)"><span class="mobMMarwback"></span>'${menuItem[x].children[c].parent}</a></li>`;
                    } else {
                            menusHtml += `<li><a href="${menuItem[x].children[c].href}">${menuItem[x].children[c].parent}</a></li>`;
                    }
                }
                menusHtml += '</ul>';
            }
            menusHtml += '</div>'
        }
        /*end fixed vkg code*/

        menusHtml+='</div>'
        +'</div>'
        +'</div>';

        if(menusHtml) {
            jQuery("#footer").append(menusHtml)
        }
    }


    function loadcssfile(filename) {
        var head = document.getElementsByTagName('body')[0];
        var style = document.createElement('link');
        style.href = filename;
        style.type = 'text/css';
        style.rel = 'stylesheet';
        head.appendChild(style);
    }
