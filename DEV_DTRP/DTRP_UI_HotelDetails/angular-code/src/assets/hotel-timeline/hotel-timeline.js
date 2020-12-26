var HotelTimeLineBuilder = function() {
    this.parentNode;
    this.canvas;
    this.resizeHandlerCanvas;
    this.removeButtonHandler;
    this.hotelCanvas;
    this.flightLimit;
    this.flightArrival;
    this.flightDeparture;

    this.scale;
    this.originScale;

    this.dataSet;
    this.hotelElements;
    this.resizeHandler;
    this.hotelCreateCanvas;
    this.timeLineGroup;

    this.paddingVertical = 20;
    this.timePaddingFactor = 1.1;
    this.removeBtnWidth = 20;

    this.selectShift;

    this.callBack = {
        afterHotelSelect: {},
        afterHotelDeselect: {},
        duringHotelTimeChange: {},
        createNewHotel: {},
        afterHotelRemoved: {}
    }

    this.isInit = false;

    this._originEnd;
    this._createDragStart;

    this.disabled = false;
}

/**
 * dataSet: HotelTimeLineBuilderDataSet[]
 */
HotelTimeLineBuilder.prototype.init = function(parentNode, dataSet, timeStart, timeEnd) {
    var s = this;
    s.parentNode = parentNode;
    s.dataSet = s._mapData(dataSet);
    
    s.prepareDataset(s.dataSet);
    timeStart = s.validateStartEndDate(dataSet, timeStart, timeEnd).startDate;
    timeEnd = s.validateStartEndDate(dataSet, timeStart, timeEnd).endDate;

    s.canvas = d3.select(parentNode)
        .append("svg")
        .call(
            d3.zoom()
                .scaleExtent([1,10000])
                .on("zoom", function(){s.zoomTimeAxis()})
        )
        .attr("width", parseInt(d3.select(parentNode).style("width")))
        .attr("height",  parseInt(d3.select(parentNode).style("height")));
            
    s.scale = d3.scaleTime()
        .domain([new Date(timeStart), new Date(timeEnd)])
        .range([s.paddingVertical, s.canvas.attr("width")-s.paddingVertical-s.removeBtnWidth]);

    s.originScale = d3.scaleTime()
        .domain([new Date(timeStart), new Date(timeEnd)])
        .range([s.paddingVertical, s.canvas.attr("width")-s.paddingVertical-s.removeBtnWidth]);

    s.addHotelTimeLine(parseInt(d3.select(parentNode).style("width")));
    s.addTimeLine(parseInt(d3.select(parentNode).style("height")));

    s.hotelCanvas = s.canvas.append("g")
        .attr("class","hotel-wrapper");

    s.flightLimit = s.canvas.append("g")
        .attr("class","flight-limit");

    s.resizeHandlerCanvas = s.canvas.append("g")
        .attr("class","resize-handler-wrapper");

    s.removeButtonHandler = s.canvas.append("g")
        .attr("class","remove-btn-handler")
        .append("text")
        .attr("x", s.canvas.attr("width"))
        .attr("y", 24)
        .style("display","none")
        .text("X")
        .on("click", function(){
            if (s.disabled) return;
            event.stopPropagation();
            var removeShiftId = s.selectShift;
            s.removeShiftById(removeShiftId);
            s.selectShift = "";
            for (var key in s.callBack.afterHotelRemoved) {
                s.callBack.afterHotelRemoved[key](removeShiftId);
            }
        });

    s.addHotelTimeLineElements();
    s.isInit = true;
}

HotelTimeLineBuilder.prototype.zoomTimeAxis = function() {
    var s = this;
    
    s.scale = d3.event.transform.rescaleX(s.originScale);
    s.refreshTimeLineTime(false);
    s.addHotelTimeLineElements();
    s.buildFlightLimits();

    if (s.selectShift) s.updateResizeHandlerXPos();
}

HotelTimeLineBuilder.prototype.prepareDataset = function(dataSet) {
    // add ids
    for (var i = 0; i < dataSet.length; i++) {
        var dataItem = dataSet[i];
        dataItem.id = dataItem.additionalData.id;
    }
}

HotelTimeLineBuilder.prototype.addTimeLine = function(height) {
    var s = this;
    
    s.timeLineGroup = s.canvas.append("g")
        .attr("transform", "translate(0," + (height - s.paddingVertical) + ")")
        .attr("class","timeline");

    s.refreshTimeLineTime();
}

HotelTimeLineBuilder.prototype.refreshTimeLineTime = function(transition) {
    var s = this;
    if (transition == null) transition = true; 
    if (transition)
        s.timeLineGroup.transition().call(d3.axisBottom(s.scale));
    else 
        s.timeLineGroup.call(d3.axisBottom(s.scale));
}

HotelTimeLineBuilder.prototype.removeTimeLine = function() {
    var s = this;
    s.canvas.select(".timeline").remove();
}

HotelTimeLineBuilder.prototype.addHotelTimeLine = function(width) {
    var s = this;
    
    s.canvas
        .append("line")
        .attr("x1",s.paddingVertical - 10)
        .attr("y1",20)
        .attr("x2",width - s.paddingVertical + 10 - s.removeBtnWidth)
        .attr("y2",20)
        .attr("class","hotel-timeline-background-line");

    s.hotelCreateCanvas = s.canvas
        .append("g")
        .attr("class","hotel-timeline-create-block-canvas")

    s.canvas
        .append("rect")
        .attr("x", s.paddingVertical)
        .attr("y", 10)
        .attr("width", width - s.paddingVertical*2 - s.removeBtnWidth)
        .attr("height", 20)
        .attr("fill", "transparent")
        .attr("class","create-new-hotel-listener")
        .on("click", function(d){
            if (s.disabled) return;
            event.stopPropagation();
            var startDate = s._getPrevDay(d3.mouse(this)[0]);
            var oneDay = s.scale(new Date(1970,1,2)) - s.scale(new Date(1970,1,1));

            s.hotelCreateCanvas
                .append("rect")
                .attr("x", startDate)
                .attr("y", 10)
                .attr("width", oneDay)
                .attr("height", 20);

            for (var key in s.callBack.createNewHotel) {
                s.callBack.createNewHotel[key](s.scale.invert(startDate));
            }
        });
} 

HotelTimeLineBuilder.prototype.removeHotelTimeLine = function(width) {
    var s = this;
    s.canvas.select(".hotel-timeline-background-line").remove();
    s.canvas.select(".hotel-timeline-create-block-canvas").remove();
    s.canvas.select(".create-new-hotel-listener").remove();
}

HotelTimeLineBuilder.prototype.addHotelTimeLineElements = function() {
    var s = this;

    s.hotelElements = s.hotelCanvas
        .selectAll(".hotel-elements")
        .data(s.dataSet);

    s.hotelElements
        .attr("width", function(d){
            return s.scale(new Date(d.timeEnd)) - s.scale(new Date(d.timeStart));
        })
        .attr("height", 20)
        .attr("x",function(d){
            return s.scale(d.timeStart);
        })
        .attr("y",10)
        .style("stroke", function(d){
            if (s.selectShift == d.id) return "orange";
            if (!s.isInsideFlights(d.timeStart, d.timeEnd)) return "red";
        })
        .style("stroke-width", function(d){
            if (s.selectShift != d.id && !s.isInsideFlights(d.timeStart, d.timeEnd)) return "1";
        })
        .style("fill", function(d,i){
            return HotelItemColorBuilder.stringToRGB(d.id);
        });

    s.hotelElements
        .enter()
        .append("rect")
        .attr("class","hotel-elements")
        .attr("width", function(d){
            return s.scale(new Date(d.timeEnd)) - s.scale(new Date(d.timeStart));
        })
        .attr("height", 20)
        .attr("x",function(d){
            return s.scale(d.timeStart);
        })
        .attr("y",10)
        .style("fill", function(d,i){
            return HotelItemColorBuilder.stringToRGB(d.id);
        })
        .style("stroke", function(d){
            if (s.selectShift == d.id) return "orange";
            if (!s.isInsideFlights(d.timeStart, d.timeEnd)) return "red";
        })
        .style("stroke-width", function(d){
            if (s.selectShift != d.id && !s.isInsideFlights(d.timeStart, d.timeEnd)) return "1";
        })
        .on("click", function(d) {
            if (s.disabled) return;
            event.stopPropagation();
            if (s.selectShift == d.id) {
                s.selectShift = "";
                s.buildRemoveHandler(false);
                for (var key in s.callBack.afterHotelDeselect) {
                    s.callBack.afterHotelDeselect[key](d);
                }
            }
            else {
                s.selectShift = d.id;
                s.buildResizeHandler(d, d3.select(this));
                s.buildRemoveHandler(true);
                for (var key in s.callBack.afterHotelSelect) {
                    s.callBack.afterHotelSelect[key](d);
                }
            }
            s.addHotelTimeLineElements();
        });

    s.hotelElements
        .exit().remove();
}

HotelTimeLineBuilder.prototype.addAfterHotelSelect = function(id, func) {
    var s = this;
    s.callBack.afterHotelSelect[id] = func;
}

HotelTimeLineBuilder.prototype.addAfterHotelDeselect = function(id, func) {
    var s = this;
    s.callBack.afterHotelDeselect[id] = func;
}

HotelTimeLineBuilder.prototype.addDuringHotelTimeChange = function(id, func) {
    var s = this;
    s.callBack.duringHotelTimeChange[id] = func;
}

HotelTimeLineBuilder.prototype.addCreateNewHotel = function(id, func) {
    var s = this;
    s.callBack.createNewHotel[id] = func;
}

HotelTimeLineBuilder.prototype.addAfterHotelRemoved = function(id, func) {
    var s = this;
    s.callBack.afterHotelRemoved[id] = func;
}


HotelTimeLineBuilder.prototype.buildResizeHandler = function(hotelData, rectElement) {
    var s = this;

    var dataSet = [
        {timePoint: hotelData.timeStart, type: "start"},
        {timePoint: hotelData.timeEnd, type: "end"}
    ];

    if (s.resizeHandler) s.resizeHandler.remove();

    s.resizeHandler = s.resizeHandlerCanvas
        .selectAll(".resize-handler")
        .data(dataSet)
        .enter()
        .append("rect")
        .attr("class","resize-handler")
        .attr("width", 10)
        .attr("height", 20)
        .attr("x",function(d){
            return s.scale(d.timePoint) - 5;
        })
        .attr("y",10)
        .style("fill", "transparent")
        .call(d3.drag()
            .on("start", function(d){
                s._originEnd = s.scale(rectElement.data()[0].timeEnd);
            })
            .on("drag", function(d){
                if (s.disabled) return;
                event.stopPropagation();
                var x = d3.mouse(this)[0],
                    data = rectElement.data()[0];

                if (d.type == "end") {
                    if (x <= parseInt(s.canvas.attr("width")) - s.paddingVertical) {
                        var nextDay = s._getNextDay(x);
                        rectElement.attr("width", Math.abs(parseInt(rectElement.attr("x")) - nextDay));
                        d3.select(this).attr("x", nextDay);

                        data.timeEnd = s.scale.invert(parseInt(rectElement.attr("x")) + parseInt(rectElement.attr("width")));

                        if (data.additionalData && data.additionalData.timeEnd) {
                            var fullDay = new Date(data.timeEnd);
                            fullDay.setDate(fullDay.getDate() + 1);
                            s._cleanDate(fullDay);
                            data.additionalData.timeEnd = fullDay;
                        }

                        for (var key in s.callBack.duringHotelTimeChange) {
                            s.callBack.duringHotelTimeChange[key](data);
                        }
                    }
                }
                if (d.type == "start") {
                    if (x >= s.paddingVertical) {
                        var prevDay = s._getPrevDay(x);
                        rectElement
                            .attr("x", prevDay)
                            .attr("width", s._originEnd - prevDay);
                        
                        data.timeStart = s.scale.invert(parseInt(rectElement.attr("x")));

                        if (data.additionalData && data.additionalData.timeStart) {
                            var fullDay = new Date(data.timeStart);
                            fullDay.setDate(fullDay.getDate() + 1);
                            s._cleanDate(fullDay);
                            data.additionalData.timeStart = fullDay;
                        }

                        d3.select(this).attr("x", prevDay);

                        for (var key in s.callBack.duringHotelTimeChange) {
                            s.callBack.duringHotelTimeChange[key](data);
                        }
                    }
                }
            })
            .on("end", function(){
                s._originEnd = null;
            })
        );
}

HotelTimeLineBuilder.prototype.updateResizeHandlerXPos = function() {
    var s = this;
    if (!s.resizeHandler) return;

    s.resizeHandler
        .attr("x",function(d){
            return s.scale(d.timePoint) - 5;
        });
}

HotelTimeLineBuilder.prototype._getNextDay = function(value) {
    var s = this;
    var timePoint = s.scale.invert(value);
    var nextDay = new Date(timePoint);
    nextDay.setDate(nextDay.getDate() + 1);
    s._cleanDate(nextDay);
    return s.scale(nextDay);
}

HotelTimeLineBuilder.prototype._getPrevDay = function(value) {
    var s = this;
    var timePoint = s.scale.invert(value);
    var nextDay = new Date(timePoint);
    s._cleanDate(nextDay);
    return s.scale(nextDay);
}

HotelTimeLineBuilder.prototype._cleanDate = function(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
}

HotelTimeLineBuilder.prototype.buildRemoveHandler = function(shiftSelected) {
    var s = this;
    s.removeButtonHandler.style("display",function(){
        if (shiftSelected) return "block";
        return "none";
    });
}

HotelTimeLineBuilder.prototype.removeShiftById = function(shiftId) {
    var s = this;
    if (!shiftId) shiftId = s.selectShift;
    var removeIndex = s.dataSet.findIndex(hotelData=>{
        return hotelData.id == shiftId;
    });

    s.dataSet.splice(removeIndex, 1);
    s.addHotelTimeLineElements();
    s.removeButtonHandler.style("display","none");
}

HotelTimeLineBuilder.prototype.destroyResizeHandler = function(id, func) {
    var s = this;
    s.resizeHandler.remove();
    s.resizeHandler = null;
}

HotelTimeLineBuilder.prototype.cleanHotelCreateCanvas = function() {
    var s = this;
    s.hotelCreateCanvas.selectAll("*").remove();
}

HotelTimeLineBuilder.prototype.addFlightLimits = function(startDate, endDate, transition) {
    var s = this;
    
    if (!startDate || !endDate) return;

    var data = [new Date(startDate), new Date(endDate)]; 

    s.buildFlightLimits(data, transition);
}

HotelTimeLineBuilder.prototype.buildFlightLimits = function(data, transition) {
    var s = this;
    
    if (transition = null) transition = true;

    if (data) {
        s.flightArrival = data[0];
        s.flightDeparture = data[1];
    }
    else data = [s.flightArrival, s.flightDeparture];

    var flightLimits = s.flightLimit
        .selectAll("line")
        .data(data);
    
    if (transition)
        flightLimits
            .transition()
            .attr("x1", function(d){
                return s.scale(d);
            })
            .attr("x2", function(d){
                return s.scale(d);
            });

    else 
        flightLimits
            .attr("x1", function(d){
                return s.scale(d);
            })
            .attr("x2", function(d){
                return s.scale(d);
            });

    flightLimits
        .enter()
        .append("line")
        .attr("x1", function(d){
            return s.scale(d);
        })
        .attr("x2", function(d){
            return s.scale(d);
        })
        .attr("y1", 6)
        .attr("y2", 31)
        .attr("class","flight-limit-line");
}

HotelTimeLineBuilder.prototype._mapData = function(data) {
    for (var i = 0; i < data.length; i++) {
        var c = data[i];
        c.timeStart = new Date(c.timeStart);
        c.timeEnd = new Date(c.timeEnd);
        c.additionalData.timeStart = new Date(c.additionalData.timeStart);
        c.additionalData.timeEnd = new Date(c.additionalData.timeEnd);
    }
    return data;
}

HotelTimeLineBuilder.prototype.removeAll = function() {
    var s = this;
    d3.select(s.parentNode).selectAll("*").remove();
}

HotelTimeLineBuilder.prototype.refreshData = function(dataSet,timeStart,timeEnd, flightArrival, flightDeparture) {
    var s = this;

    var earliestTimeStart = new Date(timeStart).getTime(),
        latestTimeEnd = (new Date(timeEnd).getTime());

    if (flightArrival && flightDeparture) {
        earliestTimeStart = new Date(Math.min(new Date(timeStart).getTime(), new Date(flightArrival).getTime()));
        latestTimeEnd = new Date(Math.max(new Date(timeEnd).getTime(), new Date(flightDeparture).getTime()));
    }

    // udpate dataSet
    s.dataSet = dataSet;
    s.prepareDataset(s.dataSet);
    timeStart = s.validateStartEndDate(dataSet, earliestTimeStart, latestTimeEnd).startDate;
    timeEnd = s.validateStartEndDate(dataSet, earliestTimeStart, latestTimeEnd).endDate;
    // update scale
    s.scale.domain([new Date(timeStart), new Date(timeEnd)]);
    s.originScale.domain([new Date(timeStart), new Date(timeEnd)]);

    s.refreshTimeLineTime();
    s.addHotelTimeLineElements();
    s.addFlightLimits(flightArrival, flightDeparture, true);
}

HotelTimeLineBuilder.prototype.validateStartEndDate = function(dataset, startDate, endDate) {
    var s = this;

    smallestStartDate = new Date(startDate) || new Date(2100,1,1);
    biggestEndDate = new Date(endDate) || new Date(1970,1,1);

    for (var i = 0; i < dataset.length; i++) {
        var c = dataset[i];
        smallestStartDate = Math.min(new Date(smallestStartDate).getTime(), new Date(c.timeStart).getTime());
        biggestEndDate = Math.max(new Date(biggestEndDate).getTime(), new Date(c.timeEnd).getTime());
    }

    return {startDate: smallestStartDate, endDate: biggestEndDate};
}

HotelTimeLineBuilder.prototype.isInsideFlights = function(startDate, endDate) {
    var s = this;
    return (
        new Date(startDate).getTime() >= new Date(s.flightArrival).getTime() && new Date(startDate).getTime() <= new Date(s.flightDeparture).getTime() &&
        new Date(endDate).getTime() >= new Date(s.flightArrival).getTime() && new Date(endDate).getTime() <= new Date(s.flightDeparture).getTime()
    );
}

HotelTimeLineBuilder.prototype.disableSelector = function(disable) {
    var s = this;
    s.disabled = disable;
}


var HotelTimeLineBuilderDataSetItem = function() {
    this.timeStart;
    this.timeEnd;
    this.hotelName;
    this.additionalData;
}

var HotelItemColorBuilder = function() {
}

HotelItemColorBuilder.hashCode = function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
} 

HotelItemColorBuilder.intToRGB = function(i) {
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

HotelItemColorBuilder.stringToRGB = function(str) {
    return HotelItemColorBuilder.intToRGB(HotelItemColorBuilder.hashCode(str));
}