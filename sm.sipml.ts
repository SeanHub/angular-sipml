namespace sm.services {
    export class sipml {
        public static $inject = [];
        private _SIP_CLIENT = window['SIPml'] || null;
        private sipEnabled = false;
        private sipStack = null;
        private sipSessionCall = null;
        private sipSessionCallMute = false;
        private sipSessionRegister = null;
        private audioElement = new Audio();
        private ringingTone = new Audio();
        private onSipSessionCallConnectingFn = null;
        private onSipSessionCallConnectedFn = null;
        private onSipSessionCallDeclinedFn = null;
        private onSipSessionCallIncomingFn = null;
        private onSipSessionCallRingingFn = null;
        private onSipSessionCallTerminatedFn = null;
        private sipSessionCallConfig = {
            audio_remote: this.audioElement,
            events_listener: {
                events: '*',
                listener: (evt) => {
                    this.onSipCallEventSession(evt);
                }
            }
        };
        private _SIP_EVENTS = {
            _CANCELLED: 'request cancelled',
            _CONNECTED: 'in call',
            _CONNECTING: 'call in progress...',
            _DECLINED: 'declined',
            _DENIED: 'media refused',
            _FAILED_TO_START: 'failed to connet to the server',
            _FORBIDDEN: 'forbidden',
            _INCOMING_CALL: 'incoming call',
            _REJECTED: 'call rejected',
            _RINGING: 'ringing',
            _STARTED: 'stack started',
            _TERMINATED: 'call terminated'
        };

        constructor() {
            this._SIP_CLIENT.setDebugLevel('fatal');
            this.audioElement.autoplay = true;
            this.ringingTone.loop = true;
            this.ringingTone.src = 'ringingtone.mp3';
        };

        public init(options) {
            return new Promise((resolve, reject) => {
                if (!this.sipStack && !this.sipEnabled) {
                    this.sipEnabled = true;
                    this._SIP_CLIENT.init(() => {
                        this.sipStack = new this._SIP_CLIENT.Stack({
                            realm: options.realm,
                            impi: options.impi,
                            impu: options.impu,
                            password: options.password,
                            display_name: "Web Phone",
                            websocket_proxy_url: options.websocket_proxy_url,
                            outbound_proxy_url: options.outbound_proxy_url,
                            enable_rtcweb_breaker: true,
                            events_listener: {
                                events: '*',
                                listener: (evt) => {
                                    this.onSipEventStack(evt, resolve, reject);
                                }
                            },
                            enable_early_ims: true,
                            enable_media_stream_cache: false,
                            bandwidth: null,
                            ice_servers: []
                        }, (err) => {
                            reject(err);
                        });
                    }, (err) => {
                        console.log(err)
                        reject(err);
                    });
                    this.sipStack.start();
                } else {
                    /*
                        Check if a sipStack is available to use (it may have failed to connect)
                        If no sipStack is available, sipEnabled should reamin as false
                        Not sure of a surefire way to check if a sipStack is available
                    */
                    if (this.onSipSessionCallIncomingFn) {
                        this.sipEnabled = true;
                        resolve();
                    } else {
                        reject();
                    };
                };
            });
        };

        private onSipEventStack(evt, resolve, reject): void {
            if (this.sipStack && this.sipEnabled) {
                switch (evt.description.toLowerCase()) {
                    case this._SIP_EVENTS._STARTED:
                        {
                            try {
                                this.sipSessionRegister = this.sipStack.newSession('register', {
                                    expires: 200,
                                    events_listener: {
                                        events: '*',
                                        listener: (evt) => {
                                            if (evt.type === 'connected') {
                                                resolve();
                                            } else if (evt.type === 'terminated') {
                                                reject(evt.description);
                                            };
                                        }
                                    }
                                });
                                this.sipSessionRegister.register();
                            } catch (err) {
                                console.error(err);
                            };
                            break;
                        };
                    case this._SIP_EVENTS._DENIED:
                        //Browser is blocking the request for user media
                        this.onSipSessionCallDeclinedFn();
                        break;
                    case this._SIP_EVENTS._FAILED_TO_START:
                        reject(evt.description);
                        break;
                    case this._SIP_EVENTS._INCOMING_CALL:
                        this.sipSessionCall = evt.newSession;
                        this.sipSessionCall.setConfiguration(this.sipSessionCallConfig);
                        this.onSipSessionCallIncomingFn(this.sipSessionCall.getRemoteFriendlyName());
                        this.setRingtonePlayback(true);
                        break;
                    default:
                        break;
                };
            };
        };
        
        private setRingtonePlayback(play): void {
            play ? this.ringingTone.play() : this.ringingTone.pause();
        };

        public answer(): void {
            if (this.sipSessionCall) {
                this.sipSessionCall.accept(this.sipSessionCallConfig);
            };
        };
        
        public call(number): void {
            if (number) {
                this.sipSessionCall = this.sipStack.newSession('call-audio', this.sipSessionCallConfig);

                if (this.sipSessionCall.call(number) != 0) {
                    this.sipSessionCall = null;
                    return;
                };

                this.setCallAudio();
            };
        };

        public decline(): void {
            this.sipSessionCall.hangup();
        };

        public destroy(): void {
            this.sipEnabled = false;
        };
        
        public endCall(): void {
            this.sipSessionCall.hangup();
        };

        private onSipCallEventSession(evt) {
            switch (evt.description.toLowerCase()) {
                case this._SIP_EVENTS._DECLINED:
                    if (this.onSipSessionCallDeclinedFn) {
                        this.onSipSessionCallDeclinedFn();
                    };
                    this.setRingtonePlayback(false);
                    break;
                case this._SIP_EVENTS._RINGING:
                    if (this.onSipSessionCallRingingFn) {
                        this.onSipSessionCallRingingFn();
                    };
                    this.setRingtonePlayback(true);
                    break;
                case this._SIP_EVENTS._CONNECTED:
                    if (this.onSipSessionCallConnectedFn) {
                        this.onSipSessionCallConnectedFn();
                    };
                    this.setRingtonePlayback(false);
                    break;
                case this._SIP_EVENTS._CONNECTING:
                    if (this.onSipSessionCallConnectingFn) {
                        this.onSipSessionCallConnectingFn();
                    };
                    break;
                case this._SIP_EVENTS._CANCELLED:
                case this._SIP_EVENTS._FORBIDDEN:
                case this._SIP_EVENTS._TERMINATED:
                case this._SIP_EVENTS._REJECTED:
                    if (this.onSipSessionCallTerminatedFn) {
                        this.onSipSessionCallTerminatedFn();
                    };
                    this.setRingtonePlayback(false);
                    break;
                default:
                    break;
            };
        };

        public onSipSessionCallConnecting(fn: Function): void {
            this.onSipSessionCallConnectingFn = fn;
        };

        public onSipSessionCallConnected(fn: Function): void {
            this.onSipSessionCallConnectedFn = fn;
        };

        public onSipSessionCallDeclined(fn: Function): void {
            this.onSipSessionCallDeclinedFn = fn;
        };

        public onSipSessionCallIncoming(fn: Function): void {
            this.onSipSessionCallIncomingFn = fn;
        };

        public onSipSessionCallRinging(fn: Function): void {
            this.onSipSessionCallRingingFn = fn;
        };

        public onSipSessionCallTerminated(fn: Function): void {
            this.onSipSessionCallTerminatedFn = fn;
        };

        public muteCall(mute) {
            this.sipSessionCallMute = mute;
            this.setCallAudio();
        };

        private setCallAudio(): void {
            if (this.sipSessionCall) {
                this.sipSessionCall.mute('audio', this.sipSessionCallMute);
            };
        };
    };
};

angular.module('sm.sipml').service('sipml', sm.services.sipml);