import AbstractRenderer from "../AbstractRenderer";
import NodeBase from "../DisplayNodeBase";
import Node from "../DisplayNode";
import computeLayout_ from "css-layout";
import {rect,roundedRect1,roundedRect4,line,lineH,lineV,fillTextMultiline} from "./DrawUtils";
import {measureText} from "./MeasureUtils";

export default class CanvasRenderer extends AbstractRenderer {
    constructor(canvas){
        super();

        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._base = new NodeBase();
        this._base.size = [canvas.width, canvas.height];
        this._debugDraw = true;
    }

    computeLayout(){
        let ctx = this._ctx;
        this._base.updateLayoutNode();

        function measure(maxWidth = 0, maxHeight = 0){
            let layout = this._layoutNode.layout;
            let style = this._layoutNode.style;

            let borderWidth = style.borderWidth || 0;
            let fontSize = style.fontSize || 0;
            let paddingTop = style.paddingTop || 0;
            let paddingRight = style.paddingRight || 0;
            let paddingLeft = style.paddingLeft || 0;
            let paddingBottom = style.paddingBottom || 0;

            if(style.padding){
                paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
            }

            ctx.font = `${fontSize}px ${style.fontFamily || 'Arial'}`;

            let width = 0;
            let height = 0;

            switch(style.whiteSpace){
                case 'nowrap':
                    width = ctx.measureText(this._textContent).width;
                    height = fontSize;
                    break;

                case 'normal':
                default:
                    let size = measureText(
                        ctx, this._textContent,{
                            fontSize : fontSize,
                            lineHeight : style.lineHeight,
                            maxWidth : Math.max(layout.width, maxWidth) - (paddingRight + paddingLeft + borderWidth * 2)
                        }
                    );
                    width = size.width;
                    height = size.height;
                    break;
            }

            return {
                width : Math.max(width, maxWidth),
                height : Math.max(height, maxHeight)
            };
        }

        function inject(node){
            let style = node.layoutNode.style;

            if(node.textContent && node.textContent.length !== 0){
                style.measure = measure.bind(node);
            }else if(style.measure){
                delete style.measure;
            }

            for(let child of node.children){
                inject(child);
            }
        }

        inject(this._base);
        computeLayout_(this._base._layoutNode);
    }

    drawNodeDebug(node){
        let ctx = this._ctx;

        let layout = node.layoutNode.layout;
        let style = node.layoutNode.style;

        function drawMargin(t, r = t, b = t, l = t){
            if(t === 0 || r === 0 || b === 0 || l === 0){
                return;
            }
            let centerV = layout.height * 0.5;
            let centerH = layout.width * 0.5;

            let handle = Math.min(Math.min(layout.width, layout.height), 20);
            let handleVA = centerV - handle * 0.5;
            let handleVB = centerV + handle * 0.5;
            let handleHA = centerH - handle * 0.5;
            let handleHB = centerH + handle * 0.5;

            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            lineV(ctx, -l, handleVA, handleVB);
            lineV(ctx, 0, handleVA, handleVB);
            lineH(ctx, -l, 0, centerV);
            lineV(ctx, layout.width + r, handleVA, handleVB);
            lineV(ctx, layout.width, handleVA, handleVB);
            lineH(ctx, layout.width, layout.width + r, centerV);
            lineH(ctx, handleHA, handleHB, -t);
            lineH(ctx, handleHA, handleHB, 0);
            lineV(ctx, centerH, -t, 0);
            lineH(ctx, handleHA, handleHB, layout.height);
            lineH(ctx, handleHA, handleHB, layout.height + b);
            lineV(ctx, centerH, layout.height, layout.height + b);
            ctx.stroke();

            ctx.strokeStyle = '#00ff00';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            rect(ctx, -l, -t, layout.width + r + l, layout.height + b + t);
            ctx.stroke();
        }

        function drawSize(inset){
            ctx.beginPath();
            if(style.borderRadius){
                roundedRect1(ctx, 0, 0, layout.width, layout.height, style.borderRadius, inset);
            }else{
                let tl = style.borderRadiusTopLeft || 0;
                let tr = style.borderRadiusTopRight || 0;
                let br = style.borderRadiusBottomRight || 0;
                let bl = style.borderRadiusBottomLeft || 0;

                if(tl === 0 && tr === 0 && br === 0 && bl === 0){
                    rect(ctx, 0, 0, layout.width, layout.height, inset);
                }else{
                    roundedRect4(ctx, 0, 0, layout.width, layout.height, tl, tr, br, bl, inset);
                }
            }
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(layout.left, layout.top);

        let borderWidth = style.borderWidth || 0;
        ctx.setLineDash([5, 5]);

        //padding all
        ctx.strokeStyle = '#00ff00';
        if(style.padding){
            let padding = style.padding + borderWidth;
            ctx.beginPath();
            lineH(ctx, 0, layout.width, padding);
            lineH(ctx, 0, layout.width, layout.height - padding);
            lineV(ctx, padding, 0, layout.height);
            lineV(ctx, layout.width - padding, 0, layout.height);
            ctx.stroke();

        //padding individual
        }else{
            ctx.beginPath();
            if(style.paddingTop){
                lineH(ctx, 0, layout.width, style.paddingTop + borderWidth);
            }
            if(style.paddingRight){
                lineV(ctx, layout.width - borderWidth - style.paddingRight, 0, layout.height);
            }
            if(style.paddingBottom){
                lineH(ctx, 0, layout.width, layout.height - style.paddingBottom - borderWidth);
            }
            if(style.paddingLeft){
                lineV(ctx, style.paddingLeft + borderWidth, 0, layout.height);
            }
            ctx.stroke();
        }

        //margin all
        ctx.strokeStyle = '#ff00ff';
        if(style.margin){
            drawMargin(style.margin);
        //margin individual
        }else{
            drawMargin(style.marginTop || 0, style.marginRight || 0, style.marginBottom || 0, style.marginLeft || 0)
        }

        ctx.setLineDash([]);

        ctx.strokeStyle = '#ffff00';
        if(style.borderWidth){
            ctx.lineWidth = style.borderWidth;
            drawSize(style.borderWidth);
            ctx.lineWidth = 1;
        }

        ctx.setLineDash([5, 5]);

        //dimension
        ctx.strokeStyle = '#ff0000';
        drawSize();

        //origin
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 0, 5, 5);

        //text-content
        if(node.textContent && node.textContent.length != 0){
            let fontSize = style.fontSize || 0;
            let paddingTop = style.paddingTop || 0;
            let paddingRight = style.paddingRight || 0;
            let paddingLeft = style.paddingLeft || 0;
            let paddingBottom = style.paddingBottom || 0;

            if(style.padding){
                paddingTop = paddingRight = paddingBottom = paddingLeft = style.padding;
            }

            let x = borderWidth + paddingLeft;
            let y = borderWidth + paddingTop + fontSize - 2;

            ctx.font = `${fontSize}px ${style.fontFamily || 'Arial'}`;

            switch(style.whiteSpace){
                case 'nowrap':
                    ctx.fillText(node.textContent, x, y);
                    break;
                case 'normal':
                default:
                    fillTextMultiline(
                        ctx, node.textContent,
                        x, y, {
                            fontSize: fontSize,
                            lineHeight: style.lineHeight,
                            textAlign : style.textAlign,
                            maxWidth: layout.width - (paddingRight + paddingLeft + borderWidth * 2)
                        }
                    );
                    break;
            }
        }

        for(let child of node.children){
            this.drawNodeDebug(child);
        }
        ctx.restore();
    }

    draw(){
        this.computeLayout();
        let ctx = this._ctx;

        if(this._debugDraw){
            ctx.clearRect(0, 0, this._base.width, this._base.height);
            this.drawNodeDebug(this._base);
            return;
        }
    }
}