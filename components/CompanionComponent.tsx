'use client';

import {useEffect, useRef, useState} from 'react'
import {cn, configureAssistant, getSubjectColor} from "@/lib/utils";
import {vapi} from "@/lib/vapi.sdk";
import Image from "next/image";
import Lottie, {LottieRefCurrentProps} from "lottie-react";
import soundwaves from '@/constants/soundwaves.json'
import { Clipboard, Check } from 'lucide-react';
import {addToSessionHistory} from "@/lib/actions/companion.actions";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

const CompanionComponent = ({ companionId, subject, topic, name, userName, userImage, style, voice }: CompanionComponentProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [liveTranscript, setLiveTranscript] = useState<{ role: "user" | "assistant"; content: string } | null>(null);
    const [micError, setMicError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(lottieRef) {
            if(isSpeaking) {
                lottieRef.current?.play()
            } else {
                lottieRef.current?.stop()
            }
        }
    }, [isSpeaking, lottieRef])

    useEffect(() => {
        const onCallStart = () => {
            setCallStatus(CallStatus.ACTIVE);
            setMicError(null);
            try {
                setIsMuted(vapi.isMuted());
            } catch {
                setIsMuted(false);
            }
        };

        const onCallEnd = () => {
            setCallStatus(CallStatus.FINISHED);
            setLiveTranscript(null);
            addToSessionHistory(companionId);
        };

        const endCallCleanly = () => {
            setCallStatus(CallStatus.FINISHED);
            addToSessionHistory(companionId);
        };

        const onMessage = (message: Message) => {
            if (message.type !== "transcript" || !message.transcript) return;
            const role = message.role === "user" || message.role === "assistant" ? message.role : "user";
            const content = message.transcript.trim();
            if (message.transcriptType === "partial") {
                setLiveTranscript(content ? { role, content } : null);
            } else {
                if (content) setMessages((prev) => [...prev, { role, content }]);
                setLiveTranscript(null);
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onError = (error: Error) => {
            const msg = error?.message ?? String(error);
            const isCallEnded = /ejection|Meeting has ended|call ended|disconnect/i.test(msg);
            if (isCallEnded) {
                endCallCleanly();
                return;
            }
            console.warn('Vapi:', msg);
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('error', onError);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);

        return () => {
            vapi.off("call-start", onCallStart);
            vapi.off("call-end", onCallEnd);
            vapi.off("message", onMessage);
            vapi.off("error", onError);
            vapi.off("speech-start", onSpeechStart);
            vapi.off("speech-end", onSpeechEnd);
        };
    }, []);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, liveTranscript]);

    const toggleMicrophone = () => {
        try {
            const currentlyMuted = vapi.isMuted();
            vapi.setMuted(!currentlyMuted);
            setIsMuted(!currentlyMuted);
            setMicError(null);
        } catch {
            setMicError("Mikrofon şu an kullanılamıyor. Bağlantı kurulduktan sonra tekrar deneyin.");
        }
    }

    const handleCall = async () => {
        setMicError(null);
        setCallStatus(CallStatus.CONNECTING);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
            setCallStatus(CallStatus.INACTIVE);
            setMicError("Turn on the microphone to start the session.");
            return;
        }

        const assistantOverrides = {
            variableValues: { subject, topic, style },
            clientMessages: ["transcript"],
            serverMessages: [],
        };

        try {
            // @ts-expect-error
            await vapi.start(configureAssistant(voice, style), assistantOverrides);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/ejection|Meeting has ended|call ended/i.test(msg)) {
                setCallStatus(CallStatus.FINISHED);
                addToSessionHistory(companionId);
            } else {
                setCallStatus(CallStatus.INACTIVE);
                console.warn("Vapi start:", msg);
            }
        }
    }

    const handleDisconnect = () => {
        setCallStatus(CallStatus.FINISHED)
        vapi.stop()
    }

    const copyConversation = async () => {
        const assistantName = name.split(" ")[0].replace(/[.,]/g, "");
        const lines = messages.map((m) =>
            m.role === "assistant" ? `${assistantName}: ${m.content}` : `${userName}: ${m.content}`
        );
        if (liveTranscript?.content) {
            lines.push(
                liveTranscript.role === "assistant"
                    ? `${assistantName}: ${liveTranscript.content}`
                    : `${userName}: ${liveTranscript.content}`
            );
        }
        const text = lines.join("\n");
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <section className="flex flex-col h-[85vh] min-h-0">
            <section className="flex shrink-0 gap-6 max-sm:flex-col max-sm:gap-4">
                <div className="companion-section">
                    <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <div
                            className={
                            cn(
                                'absolute transition-opacity duration-1000', callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE ? 'opacity-1001' : 'opacity-0', callStatus === CallStatus.CONNECTING && 'opacity-100 animate-pulse'
                            )
                        }>
                            <Image src={`/icons/${subject}.svg`} alt={subject} width={150} height={150} className="max-sm:w-fit" />
                        </div>

                        <div className={cn('absolute transition-opacity duration-1000', callStatus === CallStatus.ACTIVE ? 'opacity-100': 'opacity-0')}>
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={soundwaves}
                                autoplay={false}
                                className="companion-lottie"
                            />
                        </div>
                    </div>
                    <p className="font-bold text-2xl">{name}</p>
                </div>

                <div className="user-section">
                    <div className="user-avatar">
                        <Image src={userImage} alt={userName} width={130} height={130} className="rounded-lg" />
                        <p className="font-bold text-2xl">
                            {userName}
                        </p>
                    </div>
                    {micError && (
                        <p className="text-amber-600 dark:text-amber-400 text-sm mb-2" role="alert">{micError}</p>
                    )}
                    <button className="btn-mic" onClick={toggleMicrophone} disabled={callStatus !== CallStatus.ACTIVE}>
                        <Image src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'} alt="mic" width={36} height={36} />
                        <p className="max-sm:hidden">
                            {isMuted ? 'Turn on microphone' : 'Turn off microphone'}
                        </p>
                    </button>
                    <button className={cn('rounded-lg py-2 cursor-pointer transition-colors w-full text-white', callStatus ===CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary', callStatus === CallStatus.CONNECTING && 'animate-pulse')} onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}>
                        {callStatus === CallStatus.ACTIVE
                        ? "End Session"
                        : callStatus === CallStatus.CONNECTING
                            ? 'Connecting'
                        : 'Start Session'
                        }
                    </button>
                </div>
            </section>

            <section className="transcript max-h-[420px] sm:min-h-[200px] border border-gray-300 rounded-lg p-5 flex flex-col flex-1 min-h-0 w-full my-4">
                <div className="flex justify-between items-center w-full mb-2 shrink-0">
                    <h3 className="text-lg font-semibold text-left">Conversation</h3>
                    <button
                        type="button"
                        onClick={copyConversation}
                        disabled={messages.length === 0 && !liveTranscript?.content}
                        className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        title="Copy conversation"
                        aria-label="Copy conversation to clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
                    </button>
                </div>

                <div className="transcript-message no-scrollbar flex-1 min-h-0 overflow-y-auto">
                    {messages.map((message, index) => {
                        if(message.role === 'assistant') {
                            return (
                                <p key={index} className="max-sm:text-sm">
                                    {
                                        name
                                            .split(' ')[0]
                                            .replace('/[.,]/g, ','')
                                    }: {message.content}
                                </p>
                            )
                        } else {
                           return <p key={index} className="text-primary max-sm:text-sm">
                                {userName}: {message.content}
                            </p>
                        }
                    })}
                    {liveTranscript && (
                        <p className="max-sm:text-sm text-muted-foreground italic">
                            {liveTranscript.role === "assistant"
                                ? `${name.split(" ")[0]}: ${liveTranscript.content}`
                                : `${userName}: ${liveTranscript.content}`}
                            <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" aria-hidden />
                        </p>
                    )}
                    <div ref={transcriptEndRef} />
                </div>

                <div className="transcript-fade" />
            </section>
        </section>
    )
}

export default CompanionComponent
