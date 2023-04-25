const connections = require('../common/connections')
const helpers = require('../common/helpers')
const api = require('../common/api')
const kurento = require('kurento-client');
const {v4: uuidv4} = require('uuid');
const fs = require('fs');

require('dotenv').config()

function CallMediaPipeline() {
    this.pipeline = null;

    this.endpoints = {
        doctor: undefined,
        patient: undefined
    }

    this.recorders = {
        doctor: undefined,
        patient: undefined,
    }

    this._pipeline_is_creating = false;
    this._waiting_for_pipeline = []
    this._ice_queue = []
    this._got_sdp = false
}

CallMediaPipeline.prototype.createPipeline = async function (room) {
    const self = this;

    if (!self._pipeline_is_creating) {
        console.log("Initiating pipeline creation...")
        self._pipeline_is_creating = true;

        const rejectAllWaitors = (error) => {
            console.log("Rejecting waitors...", self._waiting_for_pipeline)
            self._pipeline_is_creating = false;
            self._waiting_for_pipeline.forEach((actions) => actions[1](error))
            self._waiting_for_pipeline = []
            self.pipeline = null
            self.endpoints.doctor = undefined;
            self.endpoints.patient = undefined;
        }

        const resolveAllWaitors = () => {
            console.log("Resolving waitors...", self._waiting_for_pipeline)
            self._pipeline_is_creating = false;
            self._waiting_for_pipeline.forEach((actions) => actions[0]())
            self._waiting_for_pipeline = []
        }

        const createRecorder = async (pipeline, filename) => {
            let promise = new Promise((resolve, reject) => {

                pipeline.create('RecorderEndpoint', {uri: "file://" + filename}, function (error, recorderEndpoint) {
                    if (error) {
                        console.error("Error creating RecorderEndpoint", error)
                        reject()
                    }

                    resolve(recorderEndpoint);
                });
            })

            return await promise;
        }

        const createEndpoint = async (pipeline, socket) => {
            let promise = new Promise((resolve, reject) => {
                pipeline.create('WebRtcEndpoint', function (error, endpoint) {

                    if (error) {
                        console.error("Error creating WebRtcEndpoint", error)
                        reject()
                    }

                    endpoint.on('IceCandidateFound', function (event) {
                        let candidate = kurento.getComplexType('IceCandidate')(event.candidate);

                        try {
                            var type = candidate.candidate.split(" ")[7];
                            if (process.env.TURN_ONLY === true && type !== "relay") {
                                if (process.env.MESSAGE_DEBUG === true) {
                                    console.log("ICE  -  Created " + type + " candidate ignored: TURN only mode.", candidate.candidate);
                                }
                                return;
                            }
                        } catch (e) {
                            console.log("Error filter relay candidate:", e)
                        }

                        if (process.env.MESSAGE_DEBUG === true) {
                            console.log(`Got ice candidate for ${socket.id}: `, candidate)
                        }
                        helpers.sendMessage(socket, helpers.prepareMessage(api.query_types.ICE, candidate))
                    });
                    if (process.env.EXTERNAL_IP) {
                        endpoint.setExternalIPv4(process.env.EXTERNAL_IP, () => {
                            console.log("Set external ip", process.env.EXTERNAL_IP)
                            resolve(endpoint);
                        })
                    } else {
                        endpoint.setStunServerAddress(process.env.STUN_SERVER, () => {
                            console.log("Set stun url", process.env.STUN_SERVER)
                            endpoint.setStunServerPort(process.env.STUN_PORT, () => {
                                console.log("Set stun port", process.env.STUN_PORT)
                                endpoint.setTurnUrl(helpers.getTurnUri(), () => {
                                    console.log("Set TURN uri", helpers.getTurnUri())

                                    resolve(endpoint);

                                })
                            })
                        })
                    }
                });
            })

            return await promise;
        }

        const connectEndpoints = async (endpoint1, endpoint2) => {
            let promise = new Promise((resolve, reject) => {
                endpoint1.connect(endpoint2, function (error) {
                    if (error) {
                        reject()
                    }
                    resolve()
                });
            })

            return await promise;
        }

        if (!connections.get().kurento) {
            throw "No connection to kurento"
        }

        connections.get().kurento.create('MediaPipeline', async (error, pipeline) => {

            console.log(`Successfully created pipeline for room ${room.id}`)
            if (error) {
                console.error("Error creating pipeline", error)
                rejectAllWaitors(e)
                return
            }

            try {
                self.endpoints.patient = await createEndpoint(pipeline, room.sockets.patient)
                console.log(`Successfully created endpoints.patient for room ${room.id}`)
                self.endpoints.doctor = await createEndpoint(pipeline, room.sockets.doctor)
                console.log(`Successfully created endpoints.doctor for room ${room.id}`)
            } catch (e) {
                pipeline.release()
                console.error("error creating rtc endpoint", e)
                rejectAllWaitors(e)
                return
            }

            if (room.recording_enabled) {
                try {
                    let t = Date.now()

                    let dir = process.env.KURENTO_RECORDS_DIRECTORY + `/room_${room.id}`

                    self.recorders.patient = await createRecorder(pipeline, dir + `/patient_${t}.webp`)
                    console.log(`Successfully created recorders.patient for room ${room.id}`)
                    self.recorders.doctor = await createRecorder(pipeline, dir + `/doctor_${t}.webp`)
                    console.log(`Successfully created recorders.doctor for room ${room.id}`)
                } catch (e) {
                    pipeline.release()
                    console.error("error creating recorders", e)
                    rejectAllWaitors(e)
                    return
                }
            }

            try {
                await connectEndpoints(self.endpoints.patient, self.endpoints.doctor)
                await connectEndpoints(self.endpoints.doctor, self.endpoints.patient)
                console.log(`Endpoints connected for room ${room.id}`)
            } catch (e) {
                pipeline.release()
                console.error("error connecting endpoints", e)
                rejectAllWaitors(e)
                return
            }

            if (room.recording_enabled) {
                try {
                    await connectEndpoints(self.endpoints.patient, self.recorders.patient)
                    await connectEndpoints(self.endpoints.doctor, self.recorders.doctor)
                    console.log(`Recorders connected for room ${room.id}`)
                    self.recorders.patient.record((e) => {
                        console.log("recording error: ", e)
                    })
                    self.recorders.doctor.record((e) => {
                        console.log("recording error: ", e)
                    })
                    console.log(`Recorders is running for room ${room.id}`)
                } catch (e) {
                    pipeline.release()
                    console.error("error connecting recorders", e)
                    rejectAllWaitors(e)
                    return
                }
            }

            self.pipeline = pipeline
            resolveAllWaitors()
        });

    }

    console.log("Addind waitor")

    let promise = new Promise((resolve, reject) => {
        self._waiting_for_pipeline.push([resolve, reject])
    })

    return await promise
}

CallMediaPipeline.prototype.pullIce = function (socket, room, candidate) {
    let endpoint = this._getEndpointForSocket(socket, room)

    if (candidate.candidate) {
        if (this._got_sdp) {
            if (process.env.MESSAGE_DEBUG === true) {
                console.log(`Pulling candidate ${JSON.stringify(candidate)} from ${socket.id} to kurento`)
            }
            endpoint.addIceCandidate(candidate);
        } else {
            if (process.env.MESSAGE_DEBUG === true) {
                console.log(`Pulling candidate ${JSON.stringify(candidate)} from ${socket.id} to queue`)
            }
            this._ice_queue.push(candidate)
        }

    } else {
        if (process.env.MESSAGE_DEBUG === true) {
            console.log(`Ignoring candidate ${JSON.stringify(candidate)} from ${socket.id} to kurento`)
        }
    }

}

CallMediaPipeline.prototype._getEndpointForSocket = function (socket, room) {
    let endpoint = undefined

    if (socket === room.sockets.doctor) {
        endpoint = this.endpoints.doctor
    }

    if (socket === room.sockets.patient) {
        endpoint = this.endpoints.patient
    }

    if (!endpoint) {
        throw "No endpoint found"
    }

    return endpoint
}

CallMediaPipeline.prototype.generateSdpAnswer = async function (socket, room, offer) {
    let endpoint = this._getEndpointForSocket(socket, room)
    let self = this

    let promise = new Promise((resolve, reject) => {
        endpoint.processOffer(offer.sdp, (error, answer) => {
                if (error) {
                    console.error("error generating answer", error);
                    reject();
                }

                endpoint.gatherCandidates(function (error) {
                    if (error) {
                        console.log("error in gather candidates", error)
                    }
                });

                resolve(answer)

                self._got_sdp = true
                self._ice_queue.forEach((candidate) => {
                    console.log(`Pulling queued candidate ${JSON.stringify(candidate)} from ${socket.id} to kurento`)
                    endpoint.addIceCandidate(candidate);
                })

                self._ice_queue = []


            }
        );

    });

    return await promise
}

CallMediaPipeline.prototype.release = function () {
    if (this.recorders.doctor) {
        this.recorders.doctor.stop()
    }
    if (this.recorders.patient) {
        this.recorders.doctor.stop()
    }
    if (this.pipeline) this.pipeline.release();
    this.pipeline = null;
}

module.exports = {
    CallMediaPipeline: CallMediaPipeline
};

